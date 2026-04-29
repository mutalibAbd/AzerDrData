using System.Text;
using System.Threading.RateLimiting;
using AzerDr.API.Data;
using AzerDr.API.Services;
using AzerDr.API.Services.Interfaces;
using AzerDr.API.Services.Supabase;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Environment variable overrides for production secrets
// Convention: Jwt__Key, Supabase__Url, Supabase__ServiceRoleKey, etc.
// ASP.NET Core automatically maps SECTION__KEY env vars to Configuration["Section:Key"]
var dbProvider = builder.Configuration["Database:Provider"] ?? "local";
Console.WriteLine($"[Config] Database provider: {dbProvider}");

if (dbProvider == "supabase")
{
    // Validate required configuration
    var requiredKeys = new[] { "Supabase:Url", "Supabase:ServiceRoleKey", "Jwt:Key", "Jwt:Issuer", "Jwt:Audience" };
    var missing = requiredKeys.Where(k => string.IsNullOrEmpty(builder.Configuration[k])).ToList();
    if (missing.Count > 0)
        throw new InvalidOperationException($"Missing required configuration: {string.Join(", ", missing)}");

    // Supabase mode: use REST API (HTTPS, works without direct PostgreSQL/IPv4)
    builder.Services.AddHttpClient<SupabaseRestClient>(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(30);
    });
    builder.Services.AddScoped<IAuthService, SupabaseAuthService>();
    builder.Services.AddScoped<IAnomalyService, SupabaseAnomalyService>();
    builder.Services.AddScoped<IIcdService, SupabaseIcdService>();
    builder.Services.AddScoped<IAdminService, SupabaseAdminService>();
    builder.Services.AddScoped<IDiagnosisService, SupabaseDiagnosisService>();

    // WHO ICD-11 API
    builder.Services.AddScoped<IIcd11Service, Icd11Service>();
    builder.Services.AddHttpClient("icd11_auth", client =>
    {
        client.Timeout = TimeSpan.FromSeconds(15);
    });
    builder.Services.AddHttpClient("icd11_api", client =>
    {
        client.Timeout = TimeSpan.FromSeconds(10);
    });
}
else
{
    // Local mode: EF Core + direct PostgreSQL
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<IAnomalyService, AnomalyService>();
    builder.Services.AddScoped<IIcdService, IcdService>();
    builder.Services.AddScoped<IAdminService, AdminService>();
}

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddMemoryCache();

// Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    options.AddPolicy("api", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.User?.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 2
            }));
});

// CORS
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"];
var envCorsOrigins = Environment.GetEnvironmentVariable("CORS_ORIGINS");
if (!string.IsNullOrEmpty(envCorsOrigins))
{
    corsOrigins = envCorsOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
            .WithHeaders("Content-Type", "Authorization", "X-Correlation-Id")
            .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
    });
});

// Limit request body to 50KB to prevent large payload DoS attacks
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 50 * 1024;
});

// Background job for stale assignment cleanup
builder.Services.AddHostedService<AzerDr.API.Middleware.StaleAssignmentCleanup>();

var app = builder.Build();

// Seed data on startup (only in local mode)
if (dbProvider != "supabase")
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var dataPath = Path.Combine(app.Environment.ContentRootPath, "..", "..", "data");
    try
    {
        await SeedData.SeedAsync(db, dataPath);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Seed ERROR] {ex.GetType().Name}: {ex.Message}");
        if (ex.InnerException != null)
            Console.WriteLine($"[Seed INNER] {ex.InnerException.Message}");
        throw;
    }
}
else
{
    Console.WriteLine("[Config] Supabase mode: skipping local seed (data should be seeded via supabase/seed.mjs)");
}

// Global exception handler for production
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            var correlationId = context.TraceIdentifier;
            var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>()?.Error;

            logger.LogError(exception, "Unhandled exception (CorrelationId: {CorrelationId})", correlationId);

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { message = "Serverdə xəta baş verdi", correlationId });
        });
    });
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseCors("AllowFrontend");

// Security headers
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["X-XSS-Protection"] = "0"; // modern browsers use CSP instead
    await next();
});
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check endpoint
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

app.Run();


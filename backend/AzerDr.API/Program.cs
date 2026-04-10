using System.Text;
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
    // Supabase mode: use REST API (HTTPS, works without direct PostgreSQL/IPv4)
    builder.Services.AddSingleton<SupabaseRestClient>();
    builder.Services.AddScoped<IAuthService, SupabaseAuthService>();
    builder.Services.AddScoped<IAnomalyService, SupabaseAnomalyService>();
    builder.Services.AddScoped<IIcdService, SupabaseIcdService>();
    builder.Services.AddScoped<IAdminService, SupabaseAdminService>();
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
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
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
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { message = "Serverdə xəta baş verdi" });
        });
    });
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();


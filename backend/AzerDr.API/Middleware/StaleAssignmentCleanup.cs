using AzerDr.API.Services;

namespace AzerDr.API.Middleware;

/// <summary>
/// Background service that periodically releases stale anomaly assignments
/// (assigned for more than 30 minutes without being completed).
/// Only active in local (EF Core) mode. In Supabase mode, stale cleanup 
/// happens inside the get_next_anomaly PostgreSQL function.
/// </summary>
public class StaleAssignmentCleanup : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<StaleAssignmentCleanup> _logger;
    private readonly string _dbProvider;

    public StaleAssignmentCleanup(IServiceProvider services, ILogger<StaleAssignmentCleanup> logger, IConfiguration config)
    {
        _services = services;
        _logger = logger;
        _dbProvider = config["Database:Provider"] ?? "local";
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_dbProvider == "supabase")
        {
            _logger.LogInformation("Supabase mode: stale cleanup handled by DB function, background service disabled");
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

            try
            {
                using var scope = _services.CreateScope();
                var anomalyService = scope.ServiceProvider.GetRequiredService<AnomalyService>();
                await anomalyService.ReleaseStaleAssignments();
                _logger.LogInformation("Stale assignment cleanup completed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during stale assignment cleanup");
            }
        }
    }
}

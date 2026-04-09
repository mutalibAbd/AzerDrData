using AzerDr.API.Services;

namespace AzerDr.API.Middleware;

/// <summary>
/// Background service that periodically releases stale anomaly assignments
/// (assigned for more than 30 minutes without being completed).
/// </summary>
public class StaleAssignmentCleanup : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<StaleAssignmentCleanup> _logger;

    public StaleAssignmentCleanup(IServiceProvider services, ILogger<StaleAssignmentCleanup> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
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

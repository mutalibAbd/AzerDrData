using System.Security.Claims;
using AzerDr.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AzerDr.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AnomalyService _anomaly;

    public DashboardController(AnomalyService anomaly) => _anomaly = anomaly;

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _anomaly.GetStatsAsync(GetUserId());
        return Ok(stats);
    }

    [HttpGet("my-codings")]
    public async Task<IActionResult> GetMyCodings(int page = 1, int size = 20)
    {
        var codings = await _anomaly.GetMyCodingsAsync(GetUserId(), page, size);
        return Ok(codings);
    }
}

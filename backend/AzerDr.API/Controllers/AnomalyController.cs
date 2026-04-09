using System.Security.Claims;
using AzerDr.API.DTOs;
using AzerDr.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AzerDr.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnomalyController : ControllerBase
{
    private readonly AnomalyService _anomaly;

    public AnomalyController(AnomalyService anomaly) => _anomaly = anomaly;

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("next")]
    public async Task<IActionResult> GetNext()
    {
        var result = await _anomaly.GetNextAsync(GetUserId());
        if (result == null)
            return NotFound(new { message = "Kodlanmamış anomaliya qalmayıb" });

        return Ok(result);
    }

    [HttpPost("{id}/save")]
    public async Task<IActionResult> Save(int id, [FromBody] SaveCodingRequest request)
    {
        var success = await _anomaly.SaveCodingAsync(id, GetUserId(), request);
        if (!success)
            return BadRequest(new { message = "Anomaliya tapılmadı və ya sizə təyin edilməyib" });

        return Ok(new { message = "Kodlama uğurla saxlanıldı" });
    }

    [HttpPost("{id}/skip")]
    public async Task<IActionResult> Skip(int id)
    {
        var success = await _anomaly.SkipAsync(id, GetUserId());
        if (!success)
            return BadRequest(new { message = "Anomaliya tapılmadı və ya sizə təyin edilməyib" });

        return Ok(new { message = "Anomaliya keçildi" });
    }

    [HttpPost("{id}/error-report")]
    public async Task<IActionResult> ReportError(int id, [FromBody] ErrorReportRequest request)
    {
        var success = await _anomaly.ReportErrorAsync(id, GetUserId(), request);
        if (!success)
            return NotFound(new { message = "Anomaliya tapılmadı" });

        return Ok(new { message = "Xəta uğurla bildirildi" });
    }
}

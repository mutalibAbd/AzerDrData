using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using AzerDr.API.DTOs;
using AzerDr.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AzerDr.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DiagnosesController : ControllerBase
{
    private readonly IDiagnosisService _diagnoses;

    public DiagnosesController(IDiagnosisService diagnoses) => _diagnoses = diagnoses;

    /// <summary>
    /// UPSERT a diagnosis for an anomaly.
    /// Called automatically by the ECT widget on code selection.
    /// </summary>
    [HttpPost("save")]
    [EnableRateLimiting("api")]
    public async Task<IActionResult> Save([FromBody] SaveDiagnosisRequest request)
    {
        var doctorIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(doctorIdStr, out var doctorId)) return Unauthorized();

        var result = await _diagnoses.SaveAsync(doctorId, request);
        return Ok(result);
    }

    /// <summary>
    /// Get the current diagnosis for an anomaly (if any).
    /// Returns 204 No Content when no diagnosis exists yet.
    /// </summary>
    [HttpGet("anomaly/{anomalyId:int}")]
    [EnableRateLimiting("api")]
    public async Task<IActionResult> GetByAnomaly(int anomalyId)
    {
        var doctorIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(doctorIdStr, out var doctorId)) return Unauthorized();

        var result = await _diagnoses.GetByAnomalyIdAsync(anomalyId, doctorId);
        return result == null ? NoContent() : Ok(result);
    }

    /// <summary>
    /// Get paginated list of diagnoses coded by the current doctor.
    /// </summary>
    [HttpGet("my")]
    [EnableRateLimiting("api")]
    public async Task<IActionResult> GetMyDiagnoses(
        [Range(1, 200)] int page = 1,
        [Range(1, 100)] int size = 10)
    {
        var doctorIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(doctorIdStr, out var doctorId)) return Unauthorized();

        var result = await _diagnoses.GetMyDiagnosesAsync(doctorId, page, size);
        return Ok(result);
    }

    /// <summary>
    /// Delete the diagnosis for an anomaly (allows doctor to re-code).
    /// </summary>
    [HttpDelete("anomaly/{anomalyId:int}")]
    [EnableRateLimiting("api")]
    public async Task<IActionResult> DeleteByAnomaly(int anomalyId)
    {
        var doctorIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(doctorIdStr, out var doctorId)) return Unauthorized();

        var deleted = await _diagnoses.DeleteByAnomalyIdAsync(anomalyId, doctorId);
        return deleted ? Ok(new { message = "Diaqnoz silindi" }) : NotFound(new { message = "Diaqnoz tapılmadı" });
    }
}

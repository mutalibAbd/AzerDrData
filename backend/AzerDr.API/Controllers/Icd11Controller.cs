using AzerDr.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AzerDr.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class Icd11Controller : ControllerBase
{
    private readonly IIcd11Service _icd11;

    public Icd11Controller(IIcd11Service icd11) => _icd11 = icd11;

    [Obsolete("Use /api/diagnoses/save with ECT widget instead")]
    [HttpGet("search")]
    [EnableRateLimiting("api")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(new List<object>());

        var results = await _icd11.SearchAsync(q.Trim());
        return Ok(results);
    }

    [Obsolete("Use /api/diagnoses/save with ECT widget instead")]
    [HttpGet("entity/{entityId}")]
    [EnableRateLimiting("api")]
    public async Task<IActionResult> GetEntity(string entityId)
    {
        if (string.IsNullOrWhiteSpace(entityId)) return BadRequest();
        // WHO entity IDs are numeric strings
        if (!System.Text.RegularExpressions.Regex.IsMatch(entityId, @"^\d+$"))
            return BadRequest("Invalid entity ID format");

        var details = await _icd11.GetEntityDetailsAsync(entityId);
        return details == null ? NotFound() : Ok(details);
    }

    /// <summary>
    /// TODO: Return a short-lived WHO API token for the ECT widget (production mode).
    /// Currently returns 501 — ECT uses the public test server (no token needed).
    /// </summary>
    [HttpGet("/api/icd/token")]
    public IActionResult GetToken()
    {
        // TODO: implement OAuth2 token retrieval from WHO ICD API when apiSecured: true
        return StatusCode(StatusCodes.Status501NotImplemented,
            new { message = "Token endpoint not yet implemented. ECT uses public test server." });
    }
}

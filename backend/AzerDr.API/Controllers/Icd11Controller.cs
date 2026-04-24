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

    [HttpGet("search")]
    [EnableRateLimiting("api")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(new List<object>());

        var results = await _icd11.SearchAsync(q.Trim());
        return Ok(results);
    }

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
}

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
    public IActionResult Search([FromQuery] string q)
    {
        return StatusCode(StatusCodes.Status410Gone,
            new { message = "This endpoint is no longer available. Use the ECT widget directly." });
    }

    [HttpGet("entity/{entityId}")]
    [EnableRateLimiting("api")]
    public IActionResult GetEntity(string entityId)
    {
        return StatusCode(StatusCodes.Status410Gone,
            new { message = "This endpoint is no longer available. Use the ECT widget directly." });
    }

    /// <summary>
    /// Returns a short-lived WHO ICD-11 API access token for the ECT widget.
    /// Token is cached server-side for 55 minutes.
    /// </summary>
    [HttpGet("/api/icd/token")]
    [EnableRateLimiting("api")]
    public async Task<IActionResult> GetToken()
    {
        try
        {
            var token = await _icd11.GetAccessTokenAsync();
            return Ok(new { access_token = token, token_type = "Bearer" });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status502BadGateway,
                new { message = "WHO ICD-11 token service unavailable" });
        }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AzerDr.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class Icd11Controller : ControllerBase
{

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

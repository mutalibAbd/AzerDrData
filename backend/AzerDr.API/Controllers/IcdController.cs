using AzerDr.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AzerDr.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class IcdController : ControllerBase
{
    private readonly IcdService _icd;

    public IcdController(IcdService icd) => _icd = icd;

    [HttpGet("rubrikas")]
    public async Task<IActionResult> GetRubrikas()
    {
        var rubrikas = await _icd.GetRubrikasAsync();
        return Ok(rubrikas);
    }

    [HttpGet("rubrikas/{rubrikaId}/bashliqlar")]
    public async Task<IActionResult> GetBashliqlar(int rubrikaId)
    {
        var bashliqlar = await _icd.GetBashliqlarAsync(rubrikaId);
        return Ok(bashliqlar);
    }

    [HttpGet("bashliqlar/{bashliqId}/diaqnozlar")]
    public async Task<IActionResult> GetDiaqnozlar(int bashliqId)
    {
        var diaqnozlar = await _icd.GetDiaqnozlarAsync(bashliqId);
        return Ok(diaqnozlar);
    }
}

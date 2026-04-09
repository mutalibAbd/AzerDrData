using AzerDr.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AzerDr.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class IcdController : ControllerBase
{
    private readonly IIcdService _icd;

    public IcdController(IIcdService icd) => _icd = icd;

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

    [HttpGet("diaqnozlar/{diaqnozId}/qeydler")]
    public async Task<IActionResult> GetQeydler(int diaqnozId)
    {
        var qeydler = await _icd.GetQeydlerAsync(diaqnozId);
        return Ok(qeydler);
    }
}

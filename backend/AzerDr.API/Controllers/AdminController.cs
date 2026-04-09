using AzerDr.API.DTOs;
using AzerDr.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AzerDr.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _admin;

    public AdminController(IAdminService admin) => _admin = admin;

    [HttpGet("doctors")]
    public async Task<IActionResult> GetDoctors()
    {
        var doctors = await _admin.GetDoctorsAsync();
        return Ok(doctors);
    }

    [HttpPost("doctors")]
    public async Task<IActionResult> CreateDoctor([FromBody] CreateDoctorRequest request)
    {
        var result = await _admin.CreateDoctorAsync(request);
        if (result == null)
            return Conflict(new { message = "Bu istifadəçi adı artıq mövcuddur" });

        return Created($"/api/admin/doctors/{result.Id}", result);
    }

    [HttpPut("doctors/{id}")]
    public async Task<IActionResult> UpdateDoctor(Guid id, [FromBody] UpdateDoctorRequest request)
    {
        var success = await _admin.UpdateDoctorAsync(id, request);
        if (!success)
            return NotFound(new { message = "Həkim tapılmadı" });

        return Ok(new { message = "Həkim yeniləndi" });
    }

    [HttpDelete("doctors/{id}")]
    public async Task<IActionResult> DeleteDoctor(Guid id)
    {
        var success = await _admin.DeleteDoctorAsync(id);
        if (!success)
            return NotFound(new { message = "Həkim tapılmadı" });

        return Ok(new { message = "Həkim deaktiv edildi" });
    }

    [HttpGet("progress")]
    public async Task<IActionResult> GetProgress()
    {
        var progress = await _admin.GetProgressAsync();
        return Ok(progress);
    }

    [HttpGet("error-reports")]
    public async Task<IActionResult> GetErrorReports([FromQuery] string? status)
    {
        var reports = await _admin.GetErrorReportsAsync(status);
        return Ok(reports);
    }

    [HttpPut("error-reports/{id}")]
    public async Task<IActionResult> ReviewErrorReport(int id, [FromBody] ReviewErrorRequest request)
    {
        var success = await _admin.ReviewErrorReportAsync(id, request.Status);
        if (!success)
            return NotFound(new { message = "Xəta bildirişi tapılmadı" });

        return Ok(new { message = $"Xəta bildirişi {(request.Status == "accepted" ? "qəbul edildi" : "rədd edildi")}" });
    }
}

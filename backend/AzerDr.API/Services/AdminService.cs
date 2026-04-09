using AzerDr.API.Data;
using AzerDr.API.DTOs;
using AzerDr.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AzerDr.API.Services;

public class AdminService
{
    private readonly AppDbContext _db;

    public AdminService(AppDbContext db) => _db = db;

    public async Task<List<DoctorListItem>> GetDoctorsAsync()
    {
        return await _db.Users
            .Where(u => u.Role == "doctor")
            .OrderBy(u => u.CreatedAt)
            .Select(u => new DoctorListItem(
                u.Id,
                u.Username,
                u.FullName,
                u.IsActive,
                u.Codings.Count,
                u.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<DoctorListItem?> CreateDoctorAsync(CreateDoctorRequest request)
    {
        if (await _db.Users.AnyAsync(u => u.Username == request.Username))
            return null;

        var user = new User
        {
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            Role = "doctor"
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return new DoctorListItem(user.Id, user.Username, user.FullName, user.IsActive, 0, user.CreatedAt);
    }

    public async Task<bool> UpdateDoctorAsync(Guid id, UpdateDoctorRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null || user.Role != "doctor") return false;

        if (request.FullName != null) user.FullName = request.FullName;
        if (request.Password != null) user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteDoctorAsync(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null || user.Role != "doctor") return false;

        user.IsActive = false; // Soft delete
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<ProgressItem>> GetProgressAsync()
    {
        var doctors = await _db.Users
            .Where(u => u.Role == "doctor" && u.IsActive)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                CodingCount = u.Codings.Count(),
                LastCodingAt = u.Codings
                    .OrderByDescending(c => c.CreatedAt)
                    .Select(c => (DateTime?)c.CreatedAt)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return doctors
            .OrderByDescending(d => d.CodingCount)
            .Select(d => new ProgressItem(d.Id, d.FullName, d.CodingCount, d.LastCodingAt))
            .ToList();
    }

    public async Task<List<ErrorReportItem>> GetErrorReportsAsync(string? status = null)
    {
        var query = _db.ErrorReports
            .Include(e => e.Anomaly)
            .Include(e => e.Doctor)
            .AsQueryable();

        if (status != null)
            query = query.Where(e => e.Status == status);

        return await query
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new ErrorReportItem(
                e.Id,
                e.AnomalyId,
                e.Anomaly.PatientId,
                e.Doctor.FullName,
                e.FieldName,
                e.FieldName == "diagnosis" ? e.Anomaly.Diagnosis : e.Anomaly.Explanation,
                e.CorrectedText,
                e.Note,
                e.Status,
                e.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<bool> ReviewErrorReportAsync(int id, string status)
    {
        var report = await _db.ErrorReports.FindAsync(id);
        if (report == null) return false;

        report.Status = status;
        await _db.SaveChangesAsync();
        return true;
    }
}

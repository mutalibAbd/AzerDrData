using AzerDr.API.Data;
using AzerDr.API.DTOs;
using AzerDr.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AzerDr.API.Services;

public class AnomalyService
{
    private readonly AppDbContext _db;

    public AnomalyService(AppDbContext db) => _db = db;

    public async Task<DashboardStats> GetStatsAsync(Guid doctorId)
    {
        var total = await _db.Anomalies.CountAsync();
        var coded = await _db.Anomalies.CountAsync(a => a.Status == "completed");
        var pending = await _db.Anomalies.CountAsync(a => a.Status == "pending");
        var inProgress = await _db.Anomalies.CountAsync(a => a.Status == "in_progress");
        var myCodings = await _db.AnomalyCodings.CountAsync(c => c.DoctorId == doctorId);

        return new DashboardStats(total, coded, pending, inProgress, myCodings);
    }

    public async Task<List<MyCodingItem>> GetMyCodingsAsync(Guid doctorId, int page, int size)
    {
        return await _db.AnomalyCodings
            .Where(c => c.DoctorId == doctorId)
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(c => new MyCodingItem(
                c.AnomalyId,
                c.Anomaly.PatientId,
                c.Anomaly.Date.ToString("yyyy-MM-dd"),
                c.DiaqnozCode,
                c.DiaqnozName,
                c.Qeyd,
                c.CreatedAt
            ))
            .ToListAsync();
    }

    /// <summary>
    /// Atomically assigns the next unassigned anomaly to the doctor.
    /// Uses FOR UPDATE SKIP LOCKED to prevent race conditions.
    /// </summary>
    public async Task<AnomalyResponse?> GetNextAsync(Guid doctorId)
    {
        // First release any stale assignments for this doctor (older than 30 min)
        await ReleaseStaleAssignments();

        // Release any current assignment for this doctor that hasn't been completed
        await _db.Anomalies
            .Where(a => a.AssignedTo == doctorId && a.Status == "in_progress")
            .ExecuteUpdateAsync(s => s
                .SetProperty(a => a.Status, "pending")
                .SetProperty(a => a.AssignedTo, (Guid?)null)
                .SetProperty(a => a.AssignedAt, (DateTime?)null));

        // Atomically pick and assign one anomaly using raw SQL for SKIP LOCKED
        var anomaly = await _db.Database
            .SqlQueryRaw<NextAnomalyResult>("""
                UPDATE anomalies
                SET status = 'in_progress',
                    assigned_to = {0},
                    assigned_at = NOW()
                WHERE id = (
                    SELECT id FROM anomalies
                    WHERE status = 'pending'
                    ORDER BY id
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING id, report_id AS "ReportId", patient_id AS "PatientId",
                          date::text AS "Date", diagnosis AS "Diagnosis", explanation AS "Explanation"
                """, doctorId)
            .FirstOrDefaultAsync();

        if (anomaly == null) return null;

        return new AnomalyResponse(
            anomaly.Id, anomaly.ReportId, anomaly.PatientId,
            anomaly.Date, anomaly.Diagnosis, anomaly.Explanation);
    }

    public async Task<bool> SaveCodingAsync(int anomalyId, Guid doctorId, SaveCodingRequest request)
    {
        var anomaly = await _db.Anomalies
            .FirstOrDefaultAsync(a => a.Id == anomalyId && a.AssignedTo == doctorId && a.Status == "in_progress");

        if (anomaly == null) return false;

        anomaly.Status = "completed";
        anomaly.CodedBy = doctorId;
        anomaly.CodedAt = DateTime.UtcNow;

        _db.AnomalyCodings.Add(new AnomalyCoding
        {
            AnomalyId = anomalyId,
            DoctorId = doctorId,
            RubrikaCode = request.RubrikaCode,
            RubrikaName = request.RubrikaName,
            BashliqCode = request.BashliqCode,
            BashliqName = request.BashliqName,
            DiaqnozCode = request.DiaqnozCode,
            DiaqnozName = request.DiaqnozName,
            Qeyd = request.Qeyd
        });

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SkipAsync(int anomalyId, Guid doctorId)
    {
        var rows = await _db.Anomalies
            .Where(a => a.Id == anomalyId && a.AssignedTo == doctorId && a.Status == "in_progress")
            .ExecuteUpdateAsync(s => s
                .SetProperty(a => a.Status, "pending")
                .SetProperty(a => a.AssignedTo, (Guid?)null)
                .SetProperty(a => a.AssignedAt, (DateTime?)null));

        return rows > 0;
    }

    public async Task<bool> ReportErrorAsync(int anomalyId, Guid doctorId, ErrorReportRequest request)
    {
        var anomalyExists = await _db.Anomalies.AnyAsync(a => a.Id == anomalyId);
        if (!anomalyExists) return false;

        _db.ErrorReports.Add(new ErrorReport
        {
            AnomalyId = anomalyId,
            DoctorId = doctorId,
            FieldName = request.FieldName,
            CorrectedText = request.CorrectedText,
            Note = request.Note
        });

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task ReleaseStaleAssignments()
    {
        var threshold = DateTime.UtcNow.AddMinutes(-30);
        await _db.Anomalies
            .Where(a => a.Status == "in_progress" && a.AssignedAt < threshold)
            .ExecuteUpdateAsync(s => s
                .SetProperty(a => a.Status, "pending")
                .SetProperty(a => a.AssignedTo, (Guid?)null)
                .SetProperty(a => a.AssignedAt, (DateTime?)null));
    }

    // Helper class for raw SQL result mapping
    private class NextAnomalyResult
    {
        public int Id { get; set; }
        public string ReportId { get; set; } = "";
        public string PatientId { get; set; } = "";
        public string Date { get; set; } = "";
        public string Diagnosis { get; set; } = "";
        public string Explanation { get; set; } = "";
    }
}

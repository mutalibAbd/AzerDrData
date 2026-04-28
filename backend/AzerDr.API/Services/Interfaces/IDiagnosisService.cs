using AzerDr.API.DTOs;

namespace AzerDr.API.Services.Interfaces;

public interface IDiagnosisService
{
    Task<DiagnosisResponse> SaveAsync(Guid doctorId, SaveDiagnosisRequest request);
    Task<DiagnosisResponse?> GetByAnomalyIdAsync(int anomalyId);
}

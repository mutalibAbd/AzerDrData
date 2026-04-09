using AzerDr.API.Data;
using AzerDr.API.DTOs;
using Microsoft.EntityFrameworkCore;

namespace AzerDr.API.Services;

public class IcdService
{
    private readonly AppDbContext _db;

    public IcdService(AppDbContext db) => _db = db;

    public async Task<List<IcdRubrikaDto>> GetRubrikasAsync()
    {
        return await _db.IcdRubrikas
            .OrderBy(r => r.Id)
            .Select(r => new IcdRubrikaDto(r.Id, r.Code, r.Name))
            .ToListAsync();
    }

    public async Task<List<IcdBashliqDto>> GetBashliqlarAsync(int rubrikaId)
    {
        return await _db.IcdBashliqlar
            .Where(b => b.RubrikaId == rubrikaId)
            .OrderBy(b => b.Id)
            .Select(b => new IcdBashliqDto(b.Id, b.Code, b.Name))
            .ToListAsync();
    }

    public async Task<List<IcdDiaqnozDto>> GetDiaqnozlarAsync(int bashliqId)
    {
        return await _db.IcdDiaqnozlar
            .Where(d => d.BashliqId == bashliqId)
            .OrderBy(d => d.Id)
            .Select(d => new IcdDiaqnozDto(d.Id, d.Code, d.Name))
            .ToListAsync();
    }
}

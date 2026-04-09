import { useEffect, useState } from 'react';
import { Plus, UserX, RefreshCw, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function DoctorManagement() {
  const [doctors, setDoctors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', fullName: '' });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { loadDoctors(); }, []);

  const loadDoctors = async () => {
    const { data } = await api.get('/admin/doctors');
    setDoctors(data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/doctors', form);
      toast.success('Həkim yaradıldı');
      setForm({ username: '', password: '', fullName: '' });
      setShowForm(false);
      loadDoctors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xəta baş verdi');
    }
    setLoading(false);
  };

  const handleToggle = async (id, isActive) => {
    await api.put(`/admin/doctors/${id}`, { isActive: !isActive });
    toast.success(isActive ? 'Deaktiv edildi' : 'Aktiv edildi');
    loadDoctors();
  };

  const handleResetPassword = async (id) => {
    const newPass = prompt('Yeni şifrəni daxil edin:');
    if (!newPass) return;
    await api.put(`/admin/doctors/${id}`, { password: newPass });
    toast.success('Şifrə yeniləndi');
  };

  const handleEditName = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/admin/doctors/${id}`, { fullName: editName.trim() });
      toast.success('Ad yeniləndi');
      setEditingId(null);
      setEditName('');
      loadDoctors();
    } catch {
      toast.error('Xəta baş verdi');
    }
  };

  return (
    <div className="bg-white border rounded-lg">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Həkimlər</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
        >
          <Plus size={14} /> Yeni həkim
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 bg-blue-50 border-b space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="İstifadəçi adı"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="border rounded px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Şifrə"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border rounded px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Ad Soyad"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="text-sm bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Yaradılır...' : 'Yarat'}
          </button>
        </form>
      )}

      <div className="divide-y">
        {doctors.map((d) => (
          <div key={d.id} className="px-4 py-3 flex items-center justify-between">
            <div>
              {editingId === d.id ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-48"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditName(d.id);
                      if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                    }}
                  />
                  <button
                    onClick={() => handleEditName(d.id)}
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                  >
                    Saxla
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditName(''); }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Ləğv
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-gray-800">{d.fullName}</span>
                  <button
                    onClick={() => { setEditingId(d.id); setEditName(d.fullName); }}
                    className="text-gray-400 hover:text-blue-600 ml-1"
                    title="Adı redaktə et"
                  >
                    <Pencil size={12} />
                  </button>
                </>
              )}
              <span className="text-sm text-gray-400 ml-2">@{d.username}</span>
              {!d.isActive && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Deaktiv</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-600 font-medium">{d.codingCount} kodlama</span>
              <button onClick={() => handleResetPassword(d.id)} className="text-gray-400 hover:text-gray-600" title="Şifrə yenilə">
                <RefreshCw size={14} />
              </button>
              <button onClick={() => handleToggle(d.id, d.isActive)} className="text-gray-400 hover:text-red-600" title={d.isActive ? 'Deaktiv et' : 'Aktiv et'}>
                <UserX size={14} />
              </button>
            </div>
          </div>
        ))}
        {doctors.length === 0 && (
          <div className="p-6 text-center text-gray-400">Heç bir həkim yoxdur</div>
        )}
      </div>
    </div>
  );
}

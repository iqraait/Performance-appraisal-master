import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  Building2, 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  X, 
  Filter, 
  Sparkles,
  ArrowUpDown,
  Check,
  Building,
  Layers,
  Info
} from 'lucide-react';

export default function LocationMaster({ token, user, selectedBranch }) {
  // Notification Toast State
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Main Data States
  const [locations, setLocations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Sorting State
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    code: '',
    department: '',
    branch: '',
    description: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Fetch Locations from API
  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/locations/`, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      } else {
        triggerToast('Failed to load duty locations', 'error');
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      triggerToast('Error connecting to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Metadata (Departments & Branches)
  const fetchMetadata = async () => {
    try {
      // Branches
      const branchRes = await fetch(`http://${window.location.hostname}:8000/api/branches/`, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        setBranches(branchData);
      }

      // Departments & Locations meta
      const metaRes = await fetch(`http://${window.location.hostname}:8000/api/meta/departments-locations/`, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        if (metaData.departments) {
          setDepartmentOptions(metaData.departments);
        }
      }
    } catch (err) {
      console.error('Error loading metadata:', err);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchMetadata();
  }, [token]);

  // Sync Locations from Employee & Trainee Records
  const handleSyncLocations = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/locations/sync_from_employees/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Token ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(data.message || `Locations synced successfully! (${data.created_count} added)`);
        fetchLocations();
        fetchMetadata();
      } else {
        triggerToast(data.error || 'Failed to sync locations', 'error');
      }
    } catch (err) {
      console.error('Error syncing locations:', err);
      triggerToast('Error during synchronization', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Toggle Location Active Status
  const handleToggleStatus = async (loc) => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/locations/${loc.id}/toggle_status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Token ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLocations(prev => prev.map(item => item.id === loc.id ? { ...item, is_active: data.is_active } : item));
        triggerToast(data.message || `Location '${loc.name}' status updated.`);
      } else {
        triggerToast('Failed to toggle status', 'error');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      triggerToast('Error toggling status', 'error');
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setModalMode('add');
    setFormData({
      id: null,
      name: '',
      code: '',
      department: '',
      branch: branches.length === 1 ? branches[0].id : '',
      description: '',
      is_active: true
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (loc) => {
    setModalMode('edit');
    setFormData({
      id: loc.id,
      name: loc.name || '',
      code: loc.code || '',
      department: loc.department || '',
      branch: loc.branch || '',
      description: loc.description || '',
      is_active: !!loc.is_active
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Save (Create or Update) Location
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Location name is required';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setFormErrors({});
    try {
      const url = modalMode === 'edit'
        ? `http://${window.location.hostname}:8000/api/locations/${formData.id}/`
        : `http://${window.location.hostname}:8000/api/locations/`;
      const method = modalMode === 'edit' ? 'PUT' : 'POST';

      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        department: formData.department.trim(),
        branch: formData.branch ? Number(formData.branch) : null,
        description: formData.description.trim(),
        is_active: formData.is_active
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Token ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast(modalMode === 'edit' ? 'Location updated successfully!' : 'New location created successfully!');
        setIsModalOpen(false);
        fetchLocations();
      } else {
        if (data.name) {
          setFormErrors({ name: Array.isArray(data.name) ? data.name[0] : data.name });
        } else {
          triggerToast(data.detail || data.error || 'Failed to save location', 'error');
        }
      }
    } catch (err) {
      console.error('Error saving location:', err);
      triggerToast('Error saving location', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (loc) => {
    setDeletingLocation(loc);
    setIsDeleteModalOpen(true);
  };

  // Delete Location
  const handleConfirmDelete = async () => {
    if (!deletingLocation) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/locations/${deletingLocation.id}/`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      if (res.ok || res.status === 204) {
        triggerToast(`Location '${deletingLocation.name}' deleted successfully.`);
        setIsDeleteModalOpen(false);
        setDeletingLocation(null);
        fetchLocations();
      } else {
        const data = await res.json().catch(() => ({}));
        triggerToast(data.detail || data.error || 'Failed to delete location', 'error');
      }
    } catch (err) {
      console.error('Error deleting location:', err);
      triggerToast('Error deleting location', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered & Sorted Locations
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (loc.name || '').toLowerCase().includes(q);
        const matchesCode = (loc.code || '').toLowerCase().includes(q);
        const matchesDept = (loc.department || '').toLowerCase().includes(q);
        const matchesDesc = (loc.description || '').toLowerCase().includes(q);
        const matchesBranch = (loc.branch_name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDept && !matchesDesc && !matchesBranch) {
          return false;
        }
      }

      // Department filter
      if (departmentFilter && (loc.department || '').toLowerCase() !== departmentFilter.toLowerCase()) {
        return false;
      }

      // Branch filter
      if (branchFilter) {
        if (loc.branch !== Number(branchFilter) && (loc.branch_name || '').toLowerCase() !== branchFilter.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'active' && !loc.is_active) return false;
      if (statusFilter === 'inactive' && loc.is_active) return false;

      return true;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'staff_count') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [locations, searchQuery, departmentFilter, branchFilter, statusFilter, sortField, sortDirection]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = locations.length;
    const active = locations.filter(l => l.is_active).length;
    const inactive = total - active;
    const totalStaff = locations.reduce((acc, curr) => acc + (Number(curr.staff_count) || 0), 0);
    const uniqueDepts = new Set(locations.map(l => l.department).filter(Boolean)).size;
    return { total, active, inactive, totalStaff, uniqueDepts };
  }, [locations]);

  // Paginated Slices
  const totalPages = Math.ceil(filteredLocations.length / pageSize) || 1;
  const paginatedLocations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLocations.slice(start, start + pageSize);
  }, [filteredLocations, currentPage, pageSize]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, departmentFilter, branchFilter, statusFilter, pageSize]);

  const hasActiveFilters = searchQuery || departmentFilter || branchFilter || statusFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('');
    setBranchFilter('');
    setStatusFilter('all');
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Toast Alert */}
      {toast && (
        <div className={`alert-toast alert-${toast.type}`} style={{ zIndex: 9999 }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 className="dashboard-title" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '8px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0, 102, 255, 0.1)',
              color: 'var(--primary)'
            }}>
              <MapPin size={24} />
            </div>
            <span>Hospital Duty Location Master</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: 0 }}>
            Configure hospital duty stations, wards, dialysis units, and clinical locations for staff assignments and appraisals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={fetchLocations} 
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Refresh locations list"
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={handleSyncLocations} 
            disabled={syncing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0369a1', borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }}
            title="Auto-discover and import any duty locations from existing Employee & Trainee records"
          >
            <Sparkles size={14} className={syncing ? 'spinner' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync from Staff Records'}</span>
          </button>

          <button 
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(0, 102, 255, 0.25)' }}
          >
            <Plus size={16} />
            <span>Add New Location</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="stat-card" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
                Total Duty Locations
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
                {metrics.total}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                Wards, units & clinics
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#0066ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={24} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.5px' }}>
                Active Locations
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a', marginTop: '6px' }}>
                {metrics.active}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                Available for selection
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#0284c7', letterSpacing: '0.5px' }}>
                Assigned Staff
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0284c7', marginTop: '6px' }}>
                {metrics.totalStaff}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                Active staff stationed
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#8b5cf6', letterSpacing: '0.5px' }}>
                Departments
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#8b5cf6', marginTop: '6px' }}>
                {metrics.uniqueDepts}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                Clinical & General tags
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '18px 20px',
        marginBottom: '20px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          alignItems: 'center'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="Search location, code, department..."
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '36px',
                fontSize: '13px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1.5px solid #e2e8f0'
              }}
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              className="form-control"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{
                fontSize: '13px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1.5px solid #e2e8f0'
              }}
            >
              <option value="">All Departments</option>
              {departmentOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <select
              className="form-control"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              style={{
                fontSize: '13px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1.5px solid #e2e8f0'
              }}
            >
              <option value="">All Hospital Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                fontSize: '13px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1.5px solid #e2e8f0'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Action */}
        {hasActiveFilters && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '12.5px',
            color: '#64748b'
          }}>
            <span>
              Showing <strong>{filteredLocations.length}</strong> of <strong>{locations.length}</strong> locations matching filters
            </span>
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: '6px'
              }}
            >
              <X size={14} />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Data Table Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', width: '60px' }}>
                  #
                </th>
                <th 
                  onClick={() => handleSort('name')}
                  style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Location Name</span>
                    <ArrowUpDown size={13} color={sortField === 'name' ? 'var(--primary)' : '#94a3b8'} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('code')}
                  style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none', width: '110px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Code</span>
                    <ArrowUpDown size={13} color={sortField === 'code' ? 'var(--primary)' : '#94a3b8'} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('department')}
                  style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Department</span>
                    <ArrowUpDown size={13} color={sortField === 'department' ? 'var(--primary)' : '#94a3b8'} />
                  </div>
                </th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Branch
                </th>
                <th 
                  onClick={() => handleSort('staff_count')}
                  style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none', textAlign: 'center', width: '130px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span>Active Staff</span>
                    <ArrowUpDown size={13} color={sortField === 'staff_count' ? 'var(--primary)' : '#94a3b8'} />
                  </div>
                </th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', width: '120px' }}>
                  Status
                </th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: '120px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: '#64748b' }}>
                      <span className="spinner"></span>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>Loading duty locations...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedLocations.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginBottom: '14px' }}>
                        <MapPin size={28} />
                      </div>
                      <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                        No Duty Locations Found
                      </h4>
                      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
                        {hasActiveFilters 
                          ? 'No locations match your current search and filter criteria.'
                          : 'No duty locations have been registered yet. Add a new location or sync from staff records.'}
                      </p>
                      {hasActiveFilters ? (
                        <button type="button" className="btn btn-secondary" onClick={handleClearFilters}>
                          Clear Filters
                        </button>
                      ) : (
                        <button type="button" className="btn btn-primary" onClick={handleOpenAddModal}>
                          <Plus size={15} style={{ marginRight: '6px' }} />
                          <span>Add First Location</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLocations.map((loc, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr 
                      key={loc.id} 
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Index */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                        {itemIndex}
                      </td>

                      {/* Location Name & Description */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{
                            padding: '6px',
                            borderRadius: '8px',
                            backgroundColor: loc.is_active ? 'rgba(0, 102, 255, 0.08)' : '#f1f5f9',
                            color: loc.is_active ? 'var(--primary)' : '#94a3b8',
                            marginTop: '2px'
                          }}>
                            <MapPin size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: '700', color: loc.is_active ? '#0f172a' : '#64748b' }}>
                              {loc.name}
                            </div>
                            {loc.description && (
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', maxWidth: '380px', lineHeight: '1.4' }}>
                                {loc.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td style={{ padding: '14px 16px' }}>
                        {loc.code ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            fontFamily: 'monospace',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #e2e8f0'
                          }}>
                            {loc.code}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '13px' }}>—</span>
                        )}
                      </td>

                      {/* Department */}
                      <td style={{ padding: '14px 16px' }}>
                        {loc.department ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8'
                          }}>
                            <Layers size={12} />
                            <span>{loc.department}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12.5px', fontStyle: 'italic' }}>
                            General / Cross-Department
                          </span>
                        )}
                      </td>

                      {/* Branch */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building size={14} color="#64748b" />
                          <span>{loc.branch_name || 'All Branches'}</span>
                        </div>
                      </td>

                      {/* Staff Count */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '14px',
                          fontSize: '12px',
                          fontWeight: '700',
                          backgroundColor: loc.staff_count > 0 ? '#f0fdf4' : '#f8fafc',
                          color: loc.staff_count > 0 ? '#15803d' : '#94a3b8',
                          border: `1px solid ${loc.staff_count > 0 ? '#bbf7d0' : '#e2e8f0'}`
                        }}>
                          <Users size={12} />
                          <span>{loc.staff_count || 0}</span>
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(loc)}
                          title={`Click to ${loc.is_active ? 'deactivate' : 'activate'}`}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: loc.is_active ? '#ecfdf5' : '#f1f5f9',
                            color: loc.is_active ? '#059669' : '#64748b',
                            border: `1px solid ${loc.is_active ? '#a7f3d0' : '#cbd5e1'}`,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: loc.is_active ? '#10b981' : '#94a3b8'
                          }}></span>
                          <span>{loc.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleOpenEditModal(loc)}
                            title="Edit Location"
                            style={{ padding: '6px 8px', borderRadius: '8px' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => handleOpenDeleteModal(loc)}
                            title="Delete Location"
                            style={{ padding: '6px 8px', borderRadius: '8px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredLocations.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#fafbfc',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#64748b' }}>
              <span>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(currentPage * pageSize, filteredLocations.length)}</strong> of <strong>{filteredLocations.length}</strong> locations
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>All</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '6px 12px', fontSize: '12.5px' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '13px', color: '#475569', padding: '0 8px', fontWeight: '600' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '6px 12px', fontSize: '12.5px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '92%', borderRadius: '20px', padding: '24px 28px' }}>
            <div className="modal-header" style={{ marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(0, 102, 255, 0.1)', color: 'var(--primary)' }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    {modalMode === 'edit' ? 'Edit Duty Location' : 'Add New Duty Location'}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {modalMode === 'edit' ? 'Update location profile and department alignment' : 'Register a new ward, clinic or duty station'}
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Location Name */}
              <div className="form-group" style={{ marginBottom: 0, textAlign: 'left' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Location Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. GENERAL WARD MALE, DIALYSIS UNIT, ANNEX - MDICU"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{
                    fontSize: '13.5px',
                    borderColor: formErrors.name ? '#ef4444' : '#e2e8f0',
                    backgroundColor: '#f8fafc'
                  }}
                />
                {formErrors.name && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.name}
                  </div>
                )}
              </div>

              {/* Short Code & Branch */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0, textAlign: 'left' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Short Code / Abbr
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. GWM, DIA, MICU"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    style={{ fontSize: '13px', backgroundColor: '#f8fafc' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0, textAlign: 'left' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Hospital Branch
                  </label>
                  <select
                    className="form-control"
                    value={formData.branch}
                    onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                    style={{ fontSize: '13px', backgroundColor: '#f8fafc' }}
                  >
                    <option value="">All Branches / Main Campus</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department Assignment */}
              <div className="form-group" style={{ marginBottom: 0, textAlign: 'left' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Associated Department
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    list="department-suggestions"
                    className="form-control"
                    placeholder="Select or enter department (e.g. NURSING, DIALYSIS)..."
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    style={{ fontSize: '13px', backgroundColor: '#f8fafc' }}
                  />
                  <datalist id="department-suggestions">
                    {departmentOptions.map(dept => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                </div>
                <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Leave empty if this duty location is shared across multiple departments.
                </span>
              </div>

              {/* Description */}
              <div className="form-group" style={{ marginBottom: 0, textAlign: 'left' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Description / Block / Floor Notes
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. Block B, 2nd Floor, Bed capacity 30"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  style={{ fontSize: '13px', backgroundColor: '#f8fafc', resize: 'vertical' }}
                />
              </div>

              {/* Active Toggle Checkbox */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                marginTop: '4px'
              }}>
                <input
                  type="checkbox"
                  id="loc_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="loc_is_active" style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                  Active for Staff Assignment & Appraisal Selection
                </label>
              </div>

              {/* Modal Actions */}
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {saving && <span className="spinner" style={{ width: '14px', height: '14px' }}></span>}
                  <span>{modalMode === 'edit' ? 'Update Location' : 'Save Location'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && deletingLocation && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '440px', width: '90%', borderRadius: '20px', padding: '24px 28px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}>
                <AlertTriangle size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                Delete Duty Location?
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Are you sure you want to remove <strong>"{deletingLocation.name}"</strong>?
              </p>
            </div>

            {/* Warning if staff are assigned */}
            {deletingLocation.staff_count > 0 && (
              <div style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}>
                <AlertCircle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12.5px', color: '#92400e', lineHeight: '1.4' }}>
                  <strong>Caution:</strong> {deletingLocation.staff_count} active hospital staff member(s) currently have this location in their profile. Deleting it will not erase their records, but it will be unlinked from the master directory.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {deleting && <span className="spinner" style={{ width: '14px', height: '14px' }}></span>}
                <span>Yes, Delete Location</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

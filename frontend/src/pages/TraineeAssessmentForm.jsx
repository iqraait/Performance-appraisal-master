import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Printer, 
  Save, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  UserCheck, 
  Clock, 
  Calendar,
  Building2,
  FileText,
  Check,
  Eye,
  RefreshCw,
  Filter
} from 'lucide-react';
import iqraaLogo from '../assets/iqraa-logo.png';

const ATTRIBUTES = [
  { id: 'job_knowledge', label: 'Job knowledge and Learning ability', sl: 1 },
  { id: 'quality_of_work', label: 'Quality of work', sl: 2 },
  { id: 'productivity', label: 'Productivity and Efficiency', sl: 3 },
  { id: 'attendance', label: 'Attendance and Punctuality', sl: 4 },
  { id: 'initiative', label: 'Initiative and Problem Solving', sl: 5 },
  { id: 'communication', label: 'Communication Skill', sl: 6 },
  { id: 'teamwork', label: 'Team work and Interpersonal Skill', sl: 7 },
  { id: 'adaptability', label: 'Adaptability and Flexibility', sl: 8 },
  { id: 'professionalism', label: 'Professionalism and Discipline', sl: 9 },
  { id: 'self_improvement', label: 'Self-improvement', sl: 10 },
];

export default function TraineeAssessmentForm({ token, user, selectedBranch }) {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialCode = searchParams.get('code') || '';

  // Tab State: 'form' for official A4 document, 'approvals' for submitted forms table
  const [activeTab, setActiveTab] = useState('form');

  const [traineeCodeInput, setTraineeCodeInput] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [traineeList, setTraineeList] = useState([]);

  // Submissions list state
  const [assessmentsList, setAssessmentsList] = useState([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Trainee snapshot data
  const [traineeData, setTraineeData] = useState({
    trainee_id: null,
    trainee_code: '',
    name: '',
    department: '',
    location: '',
    branch: selectedBranch || '',
    designation: '',
    joining_date: '',
    training_period: '1 Month',
    training_completion_date: '',
    status: 'Training'
  });

  // 10 Attributes scores: { job_knowledge: 3, ... }
  const [scores, setScores] = useState({
    job_knowledge: 0,
    quality_of_work: 0,
    productivity: 0,
    attendance: 0,
    initiative: 0,
    communication: 0,
    teamwork: 0,
    adaptability: 0,
    professionalism: 0,
    self_improvement: 0,
  });

  // Approval & Submission Metadata
  const [assessmentId, setAssessmentId] = useState(null);
  const [assessmentStatus, setAssessmentStatus] = useState('Draft');
  const [approvedBy, setApprovedBy] = useState('');
  const [approvedAt, setApprovedAt] = useState('');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [evaluatorName, setEvaluatorName] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Role permissions
  const isSuperUser = Boolean(user?.role === 'superuser' || user?.is_superuser);
  const isDeptAdmin = Boolean(user?.role === 'department_admin');
  const userDepts = user?.departments || (user?.department ? [user.department] : []);

  const canUserApproveDept = (dept) => {
    if (isSuperUser) return true;
    if (isDeptAdmin && userDepts.includes(dept)) return true;
    return false;
  };

  const isPending = assessmentStatus === 'Pending' || assessmentStatus === 'Submitted';
  const isApproved = assessmentStatus === 'Approved';
  const canApproveCurrent = assessmentId && isPending && canUserApproveDept(traineeData.department);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Automated Calculations
  const totalScore = Object.values(scores).reduce((acc, val) => acc + (parseInt(val) || 0), 0);
  const percentage = Math.round((totalScore / 30.0) * 100 * 10) / 10;

  let performanceGrade = 'Unsatisfactory';
  let gradeColor = '#ef4444';
  if (percentage >= 85) {
    performanceGrade = 'Highly performed';
    gradeColor = '#10b981';
  } else if (percentage >= 70) {
    performanceGrade = 'Well performed';
    gradeColor = '#3b82f6';
  } else if (percentage >= 50) {
    performanceGrade = 'Needs Improvement';
    gradeColor = '#f59e0b';
  }

  // Fetch all trainees for dropdown
  useEffect(() => {
    const loadTraineeOptions = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/training-employees/`, {
          headers: token ? { 'Authorization': `Token ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setTraineeList(data);
        }
      } catch (err) {
        console.error("Failed to load trainees list", err);
      }
    };
    loadTraineeOptions();
  }, [token]);

  // Fetch submitted assessments list
  const fetchAssessments = async () => {
    setLoadingAssessments(true);
    try {
      let url = `http://${window.location.hostname}:8000/api/trainee-assessments/`;
      const params = new URLSearchParams();
      if (filterDept) params.append('department', filterDept);
      if (filterStatus && filterStatus !== 'All') params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setAssessmentsList(data);
      }
    } catch (err) {
      console.error('Failed to load assessments', err);
    } finally {
      setLoadingAssessments(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAssessments();
    }
  }, [token, filterDept, filterStatus]);

  // Fetch specific trainee details & existing assessment
  const fetchTrainee = async (codeToFetch) => {
    if (!codeToFetch) return;
    setLoading(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/trainee-assessments/fetch-trainee/?code=${encodeURIComponent(codeToFetch)}`, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });

      if (response.ok) {
        const resData = await response.json();

        if (resData.exists && resData.assessment) {
          const a = resData.assessment;
          setAssessmentId(a.id);
          setAssessmentStatus(a.status || 'Pending');
          setApprovedBy(a.approved_by_name || '');
          setApprovedAt(a.approved_at || '');
          setApprovalRemarks(a.approval_remarks || '');
          setEvaluatorName(a.evaluator_name || '');
          setSubmissionDate(a.created_at || '');
          setIsSubmitted(a.status === 'Submitted' || a.status === 'Pending' || a.status === 'Approved');

          setTraineeData({
            trainee_id: a.trainee,
            trainee_code: a.trainee_code,
            name: a.name,
            department: a.department,
            location: a.location || '',
            branch: a.branch || '',
            designation: a.designation,
            joining_date: a.joining_date || '',
            training_period: a.training_period || '1 Month',
            training_completion_date: a.training_completion_date || '',
            status: 'Assessed'
          });
          setScores({
            job_knowledge: a.job_knowledge ?? 0,
            quality_of_work: a.quality_of_work ?? 0,
            productivity: a.productivity ?? 0,
            attendance: a.attendance ?? 0,
            initiative: a.initiative ?? 0,
            communication: a.communication ?? 0,
            teamwork: a.teamwork ?? 0,
            adaptability: a.adaptability ?? 0,
            professionalism: a.professionalism ?? 0,
            self_improvement: a.self_improvement ?? 0,
          });
          triggerToast(`Loaded existing assessment for ${a.name} (${a.total_score}/30) [${a.status}]`);
        } else if (resData.trainee_data) {
          const t = resData.trainee_data;
          setAssessmentId(null);
          setAssessmentStatus('Draft');
          setApprovedBy('');
          setApprovedAt('');
          setApprovalRemarks('');
          setEvaluatorName(user?.full_name || user?.username || '');
          setSubmissionDate('');
          setIsSubmitted(false);

          setTraineeData({
            trainee_id: t.trainee_id,
            trainee_code: t.trainee_code,
            name: t.name,
            department: t.department,
            location: t.location || '',
            branch: t.branch || '',
            designation: t.designation,
            joining_date: t.joining_date || '',
            training_period: t.training_period || '1 Month',
            training_completion_date: t.training_completion_date || '',
            status: t.status
          });
          setScores({
            job_knowledge: 0,
            quality_of_work: 0,
            productivity: 0,
            attendance: 0,
            initiative: 0,
            communication: 0,
            teamwork: 0,
            adaptability: 0,
            professionalism: 0,
            self_improvement: 0,
          });
          triggerToast(`Staff details loaded for ${t.name} (${t.trainee_code})`);
        }
      } else {
        const errJson = await response.json();
        triggerToast(errJson.error || 'Failed to find trainee record', 'error');
      }
    } catch (err) {
      triggerToast('Error connecting to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      fetchTrainee(initialCode);
    }
  }, [initialCode]);

  const handleScoreSelect = (attributeId, scoreValue) => {
    if (isApproved) {
      triggerToast('Approved assessments are finalized and locked.', 'error');
      return;
    }
    setScores(prev => ({
      ...prev,
      [attributeId]: parseInt(scoreValue)
    }));
  };

  const handleSaveAssessment = async (asDraft = false) => {
    if (!traineeData.trainee_id && !traineeData.trainee_code) {
      triggerToast('Please load a valid trainee before submitting', 'error');
      return;
    }

    if (isApproved && !isSuperUser) {
      triggerToast('Approved assessments are locked from modifications.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        trainee: traineeData.trainee_id,
        trainee_code: traineeData.trainee_code,
        name: traineeData.name,
        department: traineeData.department,
        location: traineeData.location,
        branch: traineeData.branch,
        designation: traineeData.designation,
        joining_date: traineeData.joining_date,
        training_period: traineeData.training_period,
        training_completion_date: traineeData.training_completion_date,
        ...scores,
        status: asDraft ? 'Draft' : 'Pending'
      };

      const response = await fetch(`http://${window.location.hostname}:8000/api/trainee-assessments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Token ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const saved = await response.json();
        setAssessmentId(saved.id);
        setAssessmentStatus(saved.status || (asDraft ? 'Draft' : 'Pending'));
        setIsSubmitted(!asDraft);
        if (!asDraft) {
          setSubmissionDate(saved.created_at || new Date().toISOString());
        }
        triggerToast(
          asDraft 
            ? 'Assessment saved as Draft.' 
            : `Assessment submitted for approval! Score: ${saved.total_score}/30 (${saved.performance_rating})`
        );
        fetchAssessments();
      } else {
        const errJson = await response.json();
        triggerToast(errJson.error || 'Failed to save assessment', 'error');
      }
    } catch (err) {
      triggerToast('Network error while saving assessment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAssessment = async (targetId, traineeName) => {
    if (!window.confirm(`Are you sure you want to approve the trainee assessment for ${traineeName || 'this staff'}? Once approved, it will be finalized as Completed.`)) {
      return;
    }
    setApprovingId(targetId);
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/trainee-assessments/${targetId}/approve/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Token ${token}` } : {})
        }
      });
      if (response.ok) {
        const data = await response.json();
        triggerToast(data.message || 'Assessment approved successfully!');
        if (assessmentId === targetId) {
          setAssessmentStatus('Approved');
          setApprovedBy(data.assessment?.approved_by_name || user?.full_name || user?.username || 'Admin');
          setApprovedAt(data.assessment?.approved_at || new Date().toISOString());
        }
        fetchAssessments();
      } else {
        const errJson = await response.json();
        triggerToast(errJson.error || 'Failed to approve assessment', 'error');
      }
    } catch (err) {
      triggerToast('Network error while approving assessment', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleLoadAssessmentForReview = (item) => {
    setActiveTab('form');
    setTraineeCodeInput(item.trainee_code);
    fetchTrainee(item.trainee_code);
  };

  const handlePrint = () => {
    window.print();
  };

  // Unique departments for filter dropdown
  const uniqueDepts = isSuperUser 
    ? [...new Set(assessmentsList.map(a => a.department))].filter(Boolean).sort()
    : userDepts;

  const pendingCount = assessmentsList.filter(a => a.status === 'Pending' || a.status === 'Submitted').length;
  const approvedCount = assessmentsList.filter(a => a.status === 'Approved').length;

  return (
    <div className="trainee-assessment-wrapper">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Screen-Only Navigation & Tabs */}
      <div className="no-print" style={{ maxWidth: '980px', margin: '0 auto 14px auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/training')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={15} />
              <span>Back to Training Master</span>
            </button>
            <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>
              Logged in as: <strong style={{ color: 'var(--text-main)' }}>{user?.username}</strong> {isDeptAdmin && `(Dept Admin - ${userDepts.join(', ')})`} {isSuperUser && `(Super Admin)`}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color, #e2e8f0)', paddingBottom: '2px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'form' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('form')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontWeight: '700',
              padding: '8px 16px',
              borderRadius: '6px 6px 0 0'
            }}
          >
            <FileText size={16} />
            <span>Assessment Form (IIHRC/HRD/0007)</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'approvals' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveTab('approvals');
              fetchAssessments();
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontWeight: '700',
              padding: '8px 16px',
              borderRadius: '6px 6px 0 0'
            }}
          >
            <CheckCircle size={16} />
            <span>Submitted Forms & Approval Flow</span>
            {pendingCount > 0 && (
              <span style={{
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 7px',
                borderRadius: '12px',
                marginLeft: '4px'
              }}>
                {pendingCount} Pending
              </span>
            )}
          </button>
        </div>
      </div>

      {/* VIEW 1: Assessment Form Document View */}
      {activeTab === 'form' && (
        <>
          {/* Screen-Only Control Toolbar */}
          <div className="no-print toolbar-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '17px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <FileText size={20} color="var(--primary)" />
                  <span>Trainee Assessment Form</span>
                </h1>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>(IIHRC/HRD/0007)</span>
              </div>

              {/* Trainee Code Quick Lookup */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text"
                    placeholder="Enter Trainee Code..."
                    value={traineeCodeInput}
                    onChange={(e) => setTraineeCodeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchTrainee(traineeCodeInput); }}
                    style={{ paddingLeft: '32px', height: '36px', fontSize: '13px', width: '180px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => fetchTrainee(traineeCodeInput)}
                  disabled={loading}
                  style={{ height: '36px' }}
                >
                  {loading ? 'Loading...' : 'Load Staff'}
                </button>

                {traineeList.length > 0 && (
                  <select
                    style={{ height: '36px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', maxWidth: '200px' }}
                    onChange={(e) => {
                      if (e.target.value) {
                        setTraineeCodeInput(e.target.value);
                        fetchTrainee(e.target.value);
                      }
                    }}
                    value={traineeData.trainee_code || ''}
                  >
                    <option value="">Select Trainee...</option>
                    {traineeList.map(t => (
                      <option key={t.id} value={t.employee_code}>
                        {t.employee_code} - {t.name} ({t.department})
                      </option>
                    ))}
                  </select>
                )}

                {/* Print Button */}
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', fontWeight: '600' }}
                  title="Print standard A4 Form"
                >
                  <Printer size={15} />
                  <span>Print Form</span>
                </button>

                {/* Submit Assessment Button */}
                {!isApproved && (
                  <button 
                    type="button" 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSaveAssessment(false)}
                    disabled={submitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', fontWeight: '700' }}
                  >
                    <Save size={15} />
                    <span>{submitting ? 'Submitting...' : 'Submit Assessment'}</span>
                  </button>
                )}

                {/* Approve Assessment Button if viewing on form */}
                {canApproveCurrent && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApproveAssessment(assessmentId, traineeData.name)}
                    disabled={approvingId === assessmentId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '36px',
                      fontWeight: '700',
                      backgroundColor: '#059669',
                      borderColor: '#059669'
                    }}
                  >
                    <CheckCircle size={15} />
                    <span>{approvingId === assessmentId ? 'Approving...' : 'Approve Now'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Status & KPI preview on screen */}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Staff Selected: </span>
                <strong style={{ color: traineeData.name ? 'var(--text-main)' : '#ef4444' }}>
                  {traineeData.name ? `${traineeData.name} (${traineeData.trainee_code}) • ${traineeData.department}` : 'None loaded'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Total Score: </span>
                <strong style={{ fontSize: '15px', color: 'var(--primary)' }}>{totalScore} / 30</strong>
                <span style={{ marginLeft: '6px', fontWeight: '600' }}>({percentage}%)</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Performance Band: </span>
                <span style={{ 
                  display: 'inline-block', 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  backgroundColor: `${gradeColor}18`, 
                  color: gradeColor, 
                  fontWeight: '700',
                  marginLeft: '4px'
                }}>
                  {performanceGrade}
                </span>
              </div>

              {/* Status Badge */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Approval Flow State:</span>
                {isApproved ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '700',
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0'
                  }}>
                    <CheckCircle size={14} />
                    <span>Approved (Completed)</span>
                  </span>
                ) : isPending ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '700',
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                    border: '1px solid #fde047'
                  }}>
                    <Clock size={14} />
                    <span>Pending Approval</span>
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b'
                  }}>
                    Draft / New
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Official Printable A4 Document Container */}
          <div className="a4-document-container">
            <div className="a4-page">
              
              {/* Document Header */}
              <div className="doc-header">
                {/* Iqraa Hospital Official Logo */}
                <div className="doc-logo-area">
                  <img src={iqraaLogo} alt="IQRAA International Hospital and Research Centre" style={{ height: '44px', maxWidth: '185px', objectFit: 'contain' }} />
                </div>

                {/* Main Centered Title */}
                <div className="doc-main-title">
                  TRAINEE ASSESSMENT FORM
                </div>

                {/* Document Control Reference Code */}
                <div className="doc-code-box">
                  IIHRC/HRD/0007
                </div>
              </div>

              {/* Section 1: Staff Details Table Grid (2 rows x 4 columns) */}
              <table className="form-grid-table">
                <tbody>
                  <tr>
                    <td className="grid-cell" style={{ width: '22%' }}>
                      <span className="cell-label">NAME:</span>
                      <span className="cell-value">{traineeData.name || '—'}</span>
                    </td>
                    <td className="grid-cell" style={{ width: '28%' }}>
                      <span className="cell-label">DEPARTMENT:</span>
                      <span className="cell-value">{traineeData.department || '—'}</span>
                    </td>
                    <td className="grid-cell" style={{ width: '25%' }}>
                      <span className="cell-label">DESIGNATION:</span>
                      <span className="cell-value">{traineeData.designation || '—'}</span>
                    </td>
                    <td className="grid-cell" style={{ width: '25%' }}>
                      <span className="cell-label">EMP CODE:</span>
                      <span className="cell-value" style={{ fontWeight: '800' }}>{traineeData.trainee_code || '—'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="grid-cell">
                      <span className="cell-label">DOJ:</span>
                      <span className="cell-value">
                        {traineeData.joining_date ? new Date(traineeData.joining_date).toLocaleDateString('en-GB') : '—'}
                      </span>
                    </td>
                    <td className="grid-cell">
                      <span className="cell-label">TRAINING PERIOD:</span>
                      <span className="cell-value">{traineeData.training_period || '1 Month'}</span>
                    </td>
                    <td className="grid-cell" colSpan={2}>
                      <span className="cell-label">DATE OF COMPLETION:</span>
                      <span className="cell-value">
                        {traineeData.training_completion_date ? new Date(traineeData.training_completion_date).toLocaleDateString('en-GB') : '—'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Instruction Note */}
              <div className="instructions-banner">
                Please evaluate the trainee against each parameter and award points: 
                <strong> 3-Excellent, 2-Good, 1-Average, 0-Poor</strong>
              </div>

              {/* Section 2: 10 Evaluation Attributes Table */}
              <table className="attributes-table">
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ width: '4%', textAlign: 'center' }}>SL.NO</th>
                    <th rowSpan={2} style={{ width: '46%', textAlign: 'left' }}>ATTRIBUTES</th>
                    <th colSpan={4} style={{ width: '40%', textAlign: 'center' }}>POINTS</th>
                    <th rowSpan={2} style={{ width: '10%', textAlign: 'center' }}>TOTAL</th>
                  </tr>
                  <tr className="points-subrow">
                    <th style={{ width: '10%', textAlign: 'center' }}>3</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>2</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>1</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>0</th>
                  </tr>
                </thead>
                <tbody>
                  {ATTRIBUTES.map((attr) => {
                    const currentScore = scores[attr.id] ?? 0;
                    return (
                      <tr key={attr.id} className="attribute-row">
                        <td style={{ textAlign: 'center', fontWeight: '700' }}>{attr.sl}</td>
                        <td style={{ fontWeight: '500' }}>{attr.label}</td>
                        {[3, 2, 1, 0].map((pt) => {
                          const isSelected = currentScore === pt;
                          return (
                            <td 
                              key={pt} 
                              className={`score-cell ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleScoreSelect(attr.id, pt)}
                            >
                              <input 
                                type="radio" 
                                name={`score_${attr.id}`} 
                                value={pt}
                                checked={isSelected}
                                onChange={() => handleScoreSelect(attr.id, pt)}
                                className="radio-input"
                                disabled={isApproved}
                              />
                              <span className="print-mark">
                                {isSelected ? '✓' : ''}
                              </span>
                            </td>
                          );
                        })}
                        <td style={{ textAlign: 'center', fontWeight: '800', backgroundColor: '#fafafa' }}>
                          {currentScore}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Section 3: Summary Scoring Rows */}
                  <tr className="total-score-row">
                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: '800' }}>
                      TOTAL SCORE:
                    </td>
                    <td colSpan={4} style={{ textAlign: 'center', fontWeight: '800' }}>
                      (Maximum Points: 30)
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '900', fontSize: '12px', backgroundColor: '#e0f2fe' }}>
                      <span className="score-badge">{totalScore}</span>
                    </td>
                  </tr>

                  {/* Percentage Row */}
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: '800', padding: '4px 6px' }}>
                      PERCENTAGE (%):
                    </td>
                    <td colSpan={5} style={{ textAlign: 'left', fontWeight: '800', padding: '4px 8px' }}>
                      <span style={{ fontSize: '12px', color: '#0369a1', fontWeight: '900' }}>
                        {percentage}%
                      </span>
                    </td>
                  </tr>

                  {/* Performance Rating Benchmark Legend */}
                  <tr className="grading-legend-row">
                    <td colSpan={7} style={{ padding: '4px 8px', fontSize: '9px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                      <span style={{ fontWeight: percentage >= 85 ? 'bold' : 'normal', color: percentage >= 85 ? '#047857' : 'inherit' }}>
                        85% and above=Highly performed
                      </span>, &nbsp;
                      <span style={{ fontWeight: percentage >= 70 && percentage < 85 ? 'bold' : 'normal', color: (percentage >= 70 && percentage < 85) ? '#0369a1' : 'inherit' }}>
                        70%-84%=Well performed
                      </span>, &nbsp;
                      <span style={{ fontWeight: percentage >= 50 && percentage < 70 ? 'bold' : 'normal', color: (percentage >= 50 && percentage < 70) ? '#d97706' : 'inherit' }}>
                        50%-69%=Needs Improvement
                      </span>, &nbsp;
                      <span style={{ fontWeight: percentage < 50 ? 'bold' : 'normal', color: percentage < 50 ? '#b91c1c' : 'inherit' }}>
                        below 50%=Unsatisfactory
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Section 4: APPROVAL FLOW & VERIFICATION (Replacing old manual signature and office use blocks) */}
              <div className="approval-flow-box">
                <div className="approval-header-label">APPROVAL WORKFLOW & VERIFICATION</div>
                
                <table className="approval-flow-table">
                  <tbody>
                    <tr>
                      {/* Step 1: Evaluator / Submitter */}
                      <td style={{ width: '50%', borderBottom: '1px solid #000', borderRight: '1px solid #000', verticalAlign: 'top', padding: '8px 12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#ffffff', textAlign: 'center', lineHeight: '16px', fontSize: '10px' }}>1</span>
                          <span>Evaluation Submission</span>
                        </div>
                        <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                          <div><strong style={{ color: '#475569' }}>Evaluator / Prepared By:</strong> {evaluatorName || user?.username || '—'}</div>
                          <div><strong style={{ color: '#475569' }}>Department:</strong> {traineeData.department || '—'}</div>
                          <div><strong style={{ color: '#475569' }}>Submission Date:</strong> {submissionDate ? new Date(submissionDate).toLocaleDateString('en-GB') : (isSubmitted ? new Date().toLocaleDateString('en-GB') : 'Pending Submission')}</div>
                          <div style={{ marginTop: '4px' }}>
                            <strong style={{ color: '#475569' }}>Submission State: </strong>
                            <span style={{
                              display: 'inline-block',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              fontWeight: '700',
                              backgroundColor: isSubmitted ? '#e0f2fe' : '#f1f5f9',
                              color: isSubmitted ? '#0369a1' : '#64748b'
                            }}>
                              {isSubmitted ? 'Submitted' : 'Draft'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Step 2: Department & Admin Approval Status */}
                      <td style={{ width: '50%', borderBottom: '1px solid #000', verticalAlign: 'top', padding: '8px 12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: isApproved ? '#059669' : '#d97706', color: '#ffffff', textAlign: 'center', lineHeight: '16px', fontSize: '10px' }}>2</span>
                          <span>Department & Admin Approval</span>
                        </div>
                        <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                          <div>
                            <strong style={{ color: '#475569' }}>Approval Status: </strong>
                            {isApproved ? (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '700',
                                backgroundColor: '#d1fae5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0'
                              }}>
                                ✓ Approved
                              </span>
                            ) : isPending ? (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '700',
                                backgroundColor: '#fef3c7',
                                color: '#d97706',
                                border: '1px solid #fde047'
                              }}>
                                ⏳ Pending Approval
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '700',
                                backgroundColor: '#f1f5f9',
                                color: '#64748b'
                              }}>
                                Draft
                              </span>
                            )}
                          </div>
                          <div>
                            <strong style={{ color: '#475569' }}>Approved By:</strong>{' '}
                            {approvedBy ? (
                              <span style={{ fontWeight: '700', color: '#065f46' }}>{approvedBy}</span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Awaiting Department / Hospital Admin Approval</span>
                            )}
                          </div>
                          <div>
                            <strong style={{ color: '#475569' }}>Approval Date:</strong>{' '}
                            {approvedAt ? new Date(approvedAt).toLocaleDateString('en-GB') + ' ' + new Date(approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                          {approvalRemarks && (
                            <div>
                              <strong style={{ color: '#475569' }}>Remarks:</strong> {approvalRemarks}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Bottom Verification Footer Bar */}
                    <tr>
                      <td colSpan={2} style={{ padding: '6px 12px', backgroundColor: '#f8fafc', fontSize: '10px', color: '#64748b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            Official Electronic Assessment & Verification • IQRAA Hospital & Research Centre
                          </span>
                          {canApproveCurrent && (
                            <div className="no-print">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleApproveAssessment(assessmentId, traineeData.name)}
                                disabled={approvingId === assessmentId}
                                style={{
                                  backgroundColor: '#059669',
                                  borderColor: '#059669',
                                  padding: '3px 10px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <CheckCircle size={13} />
                                <span>Approve Assessment</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </>
      )}

      {/* VIEW 2: Submitted Forms & Approval Flow Dashboard */}
      {activeTab === 'approvals' && (
        <div className="no-print" style={{ maxWidth: '980px', margin: '0 auto' }}>
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                Total Assessments
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                {assessmentsList.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {isSuperUser ? 'Across all departments' : `Department: ${userDepts.join(', ')}`}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde047',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '12px', color: '#b45309', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                <span>Pending Approvals</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>
                {pendingCount}
              </div>
              <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>
                Awaiting approval by {isSuperUser ? 'Hospital Admin' : 'Department Admin'}
              </div>
            </div>

            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '12px', color: '#047857', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} />
                <span>Approved Assessments</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
                {approvedCount}
              </div>
              <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>
                Finalized and marked completed
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Department Filter (Admin gets all, Dept Admin scoped) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Department:</span>
                {isSuperUser ? (
                  <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    style={{ height: '34px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '0 8px' }}
                  >
                    <option value="">All Departments</option>
                    {uniqueDepts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 8px', backgroundColor: 'var(--bg-active)', borderRadius: '4px', color: 'var(--primary)' }}>
                    {userDepts.join(', ') || 'My Department'}
                  </span>
                )}
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ height: '34px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '0 8px' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search staff, code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchAssessments(); }}
                  style={{ height: '34px', paddingLeft: '30px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', width: '180px' }}
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchAssessments}
                style={{ height: '34px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Refresh submissions"
              >
                <RefreshCw size={13} className={loadingAssessments ? 'spin' : ''} />
                <span>Filter</span>
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing <strong>{assessmentsList.length}</strong> submitted assessments
            </div>
          </div>

          {/* Submissions Table */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
          }}>
            {loadingAssessments ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 8px auto' }}></div>
                <p style={{ fontSize: '13px' }}>Loading submitted assessments...</p>
              </div>
            ) : assessmentsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                <FileText size={36} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                <p style={{ fontSize: '14px', fontWeight: '600' }}>No submitted trainee assessment forms found</p>
                <p style={{ fontSize: '12px' }}>
                  {filterStatus !== 'All' || filterDept ? 'Try clearing your filters.' : 'Completed assessments will appear here for approval.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700' }}>Trainee Code</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700' }}>Staff Name</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700' }}>Department</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700' }}>Designation</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700' }}>Score</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700' }}>Rating</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700' }}>Approval Details</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessmentsList.map((item) => {
                      const isItemPending = item.status === 'Pending' || item.status === 'Submitted';
                      const isItemApproved = item.status === 'Approved';
                      const canApproveThisItem = isItemPending && canUserApproveDept(item.department);

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--primary)' }}>
                            {item.trainee_code}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: '600' }}>
                            {item.name}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {item.department}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                            {item.designation}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '800' }}>
                            {item.total_score} / 30
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                              ({item.percentage}%)
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: '700',
                              backgroundColor: 
                                item.percentage >= 85 ? '#d1fae5' :
                                item.percentage >= 70 ? '#dbeafe' :
                                item.percentage >= 50 ? '#fef3c7' : '#fee2e2',
                              color: 
                                item.percentage >= 85 ? '#065f46' :
                                item.percentage >= 70 ? '#1e40af' :
                                item.percentage >= 50 ? '#92400e' : '#b91c1c'
                            }}>
                              {item.performance_rating || 'Unrated'}
                            </span>
                          </td>

                          {/* Status Badge in Requested Pending Color */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {isItemApproved ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: '#d1fae5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0'
                              }}>
                                <Check size={12} />
                                <span>Approved</span>
                              </span>
                            ) : isItemPending ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: '#fef3c7',
                                color: '#d97706',
                                border: '1px solid #fde047'
                              }}>
                                <Clock size={12} />
                                <span>Pending</span>
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                backgroundColor: '#f1f5f9',
                                color: '#64748b'
                              }}>
                                Draft
                              </span>
                            )}
                          </td>

                          {/* Approval Details */}
                          <td style={{ padding: '10px 14px', fontSize: '11px' }}>
                            {item.approved_by_name ? (
                              <div>
                                <span style={{ fontWeight: '700', color: '#065f46' }}>{item.approved_by_name}</span>
                                {item.approved_at && (
                                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                                    {new Date(item.approved_at).toLocaleDateString('en-GB')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Awaiting Approval
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              {/* Review in Form */}
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleLoadAssessmentForReview(item)}
                                title="Open full assessment form for review"
                              >
                                <Eye size={12} />
                                <span>View Form</span>
                              </button>

                              {/* Approve Button */}
                              {canApproveThisItem && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    backgroundColor: '#059669',
                                    borderColor: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  onClick={() => handleApproveAssessment(item.id, item.name)}
                                  disabled={approvingId === item.id}
                                  title="Approve this trainee assessment"
                                >
                                  <Check size={12} />
                                  <span>{approvingId === item.id ? 'Approving...' : 'Approve'}</span>
                                </button>
                              )}

                              {/* Print */}
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => {
                                  handleLoadAssessmentForReview(item);
                                  setTimeout(() => window.print(), 400);
                                }}
                                title="Print this assessment form"
                              >
                                <Printer size={12} />
                                <span>Print</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Embedded CSS for Exact Visual & A4 Print Layout */}
      <style dangerouslySetInnerHTML={{ __html: `
        .trainee-assessment-wrapper {
          padding: 16px;
          background-color: var(--background-color, #f1f5f9);
          min-height: 100vh;
        }

        .toolbar-card {
          max-width: 980px;
          margin: 0 auto 16px auto;
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 10px;
          padding: 14px 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        /* A4 Container Preview on Screen */
        .a4-document-container {
          display: flex;
          justify-content: center;
        }

        .a4-page {
          width: 210mm;
          min-height: 297mm;
          padding: 10mm 14mm 10mm 14mm;
          background: #ffffff;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
          box-sizing: border-box;
          color: #000000;
          font-family: Arial, Helvetica, sans-serif;
          position: relative;
        }

        /* Header */
        .doc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .doc-logo-area {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 170px;
        }

        .iqraa-title {
          font-size: 16px;
          font-weight: 900;
          color: #0369a1;
          letter-spacing: 0.5px;
          line-height: 1.1;
        }

        .iqraa-subtitle {
          font-size: 8px;
          font-weight: 800;
          color: #0369a1;
          letter-spacing: 0.8px;
        }

        .doc-main-title {
          font-size: 15px;
          font-weight: 900;
          text-align: center;
          letter-spacing: 0.5px;
          color: #000000;
          flex: 1;
        }

        .doc-code-box {
          border: 1.5px solid #000000;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-align: center;
          width: 140px;
        }

        /* Grid Table (Employee Details) */
        .form-grid-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.5px solid #000000;
          margin-bottom: 6px;
        }

        .grid-cell {
          border: 1px solid #000000;
          padding: 4px 6px;
          font-size: 11px;
          vertical-align: middle;
        }

        .cell-label {
          font-weight: 800;
          margin-right: 6px;
          color: #000000;
        }

        .cell-value {
          font-weight: 600;
          color: #000000;
        }

        /* Instructions Banner */
        .instructions-banner {
          border: 1.5px solid #000000;
          padding: 4px 8px;
          font-size: 9.5px;
          line-height: 1.3;
          margin-bottom: 8px;
          background-color: #fafafa;
        }

        /* Attributes Table */
        .attributes-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.5px solid #000000;
          margin-bottom: 8px;
        }

        .attributes-table th, .attributes-table td {
          border: 1px solid #000000;
          padding: 3.5px 4px;
          font-size: 10.5px;
        }

        .attributes-table thead th {
          background-color: #f1f5f9;
          font-weight: 800;
        }

        .points-subrow td {
          background-color: #f8fafc;
          padding: 2px 4px;
          font-size: 10px;
        }

        .attribute-row td:first-child {
          font-size: 10.5px;
        }

        .score-cell {
          text-align: center;
          cursor: pointer;
          transition: background-color 0.15s ease;
          user-select: none;
        }

        .score-cell:hover {
          background-color: #e0f2fe;
        }

        .score-cell.selected {
          background-color: #dbeafe;
        }

        .radio-input {
          cursor: pointer;
          transform: scale(1.1);
        }

        .print-mark {
          display: none;
          font-weight: 900;
          font-size: 13px;
          color: #000000;
        }

        .total-score-row td {
          background-color: #f8fafc;
          padding: 5px 6px;
          font-size: 11px;
        }

        .score-badge {
          display: inline-block;
          font-size: 13px;
          font-weight: 900;
          color: #0369a1;
        }

        /* Approval Flow Box */
        .approval-flow-box {
          border: 1.5px solid #000000;
          margin-top: 6px;
        }

        .approval-header-label {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.5px;
          padding: 3px 8px;
          border-bottom: 1px solid #000000;
          background-color: #f8fafc;
          text-align: center;
        }

        .approval-flow-table {
          width: 100%;
          border-collapse: collapse;
        }

        /* EXACT A4 PRINT STYLES */
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 10mm 6mm 10mm;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print, 
          .mobile-top-bar, 
          .sidebar, 
          .top-header {
            display: none !important;
          }

          .trainee-assessment-wrapper {
            padding: 0 !important;
            background: transparent !important;
            min-height: auto !important;
          }

          .a4-document-container {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .a4-page {
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          .radio-input {
            display: none !important;
          }

          .print-mark {
            display: inline-block !important;
          }

          /* Prevent awkward page breaks */
          table, tr, td, th, .approval-flow-box {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );
}

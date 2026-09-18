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
  FileText
} from 'lucide-react';

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

  const [traineeCodeInput, setTraineeCodeInput] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [traineeList, setTraineeList] = useState([]);

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

  // Signatures
  const [signatures, setSignatures] = useState({
    employee_signature: '',
    employee_signature_date: new Date().toISOString().split('T')[0],
    immediate_manager_signature: user ? (user.full_name || user.username) : '',
    immediate_manager_date: new Date().toISOString().split('T')[0],
    department_head_signature: '',
    department_head_date: new Date().toISOString().split('T')[0],
    authorized_signature_1: '',
    authorized_date_1: '',
    authorized_signature_2: '',
    authorized_date_2: '',
  });

  const [assessmentId, setAssessmentId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

  // Fetch all trainees for quick selection
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
          // Existing completed assessment loaded
          const a = resData.assessment;
          setAssessmentId(a.id);
          setIsSubmitted(a.status === 'Submitted');
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
          setSignatures({
            employee_signature: a.employee_signature || '',
            employee_signature_date: a.employee_signature_date || '',
            immediate_manager_signature: a.immediate_manager_signature || '',
            immediate_manager_date: a.immediate_manager_date || '',
            department_head_signature: a.department_head_signature || '',
            department_head_date: a.department_head_date || '',
            authorized_signature_1: a.authorized_signature_1 || '',
            authorized_date_1: a.authorized_date_1 || '',
            authorized_signature_2: a.authorized_signature_2 || '',
            authorized_date_2: a.authorized_date_2 || '',
          });
          triggerToast(`Loaded existing assessment for ${a.name} (${a.total_score}/30)`);
        } else if (resData.trainee_data) {
          // New assessment initialized from Trainee Master
          const t = resData.trainee_data;
          setAssessmentId(null);
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
        ...signatures,
        status: asDraft ? 'Draft' : 'Submitted'
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
        setIsSubmitted(!asDraft);
        triggerToast(`Assessment ${asDraft ? 'saved as Draft' : 'successfully Submitted'}! Final Score: ${saved.total_score}/30 (${saved.performance_rating})`);
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

  const handlePrint = () => {
    window.print();
  };

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

      {/* Screen-Only Control Toolbar */}
      <div className="no-print toolbar-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/training')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={16} />
              <span>Back to Training Master</span>
            </button>
            <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>
            <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="var(--primary)" />
              <span>Trainee Assessment Form (IIHRC/HRD/0007)</span>
            </h1>
          </div>

          {/* Trainee Code Quick Lookup */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

            {/* Action Buttons */}
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', fontWeight: '600' }}
              title="Print standard A4 Form or Save as PDF"
            >
              <Printer size={15} />
              <span>Print A4 Form</span>
            </button>

            <button 
              type="button" 
              className="btn btn-primary btn-sm"
              onClick={() => handleSaveAssessment(false)}
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', fontWeight: '700' }}
            >
              <Save size={15} />
              <span>{submitting ? 'Saving...' : 'Submit Assessment'}</span>
            </button>
          </div>
        </div>

        {/* Live Score KPI preview on screen */}
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '13px' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Staff Selected: </span>
            <strong style={{ color: traineeData.name ? 'var(--text-color)' : '#ef4444' }}>
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
          {isSubmitted && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: '600' }}>
              <CheckCircle size={15} />
              <span>Submitted to Records</span>
            </div>
          )}
        </div>
      </div>

      {/* Official Printable A4 Document Container */}
      <div className="a4-document-container">
        <div className="a4-page">
          
          {/* Document Header */}
          <div className="doc-header">
            {/* Iqraa Hospital Logo & Emblem */}
            <div className="doc-logo-area">
              <div className="iqraa-emblem">
                <svg width="42" height="42" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="48" stroke="#0284c7" strokeWidth="4" fill="#e0f2fe" />
                  <ellipse cx="50" cy="50" rx="36" ry="18" stroke="#0284c7" strokeWidth="3" fill="none" transform="rotate(-25 50 50)" />
                  <circle cx="50" cy="50" r="12" fill="#ef4444" />
                  <circle cx="68" cy="38" r="4" fill="#0284c7" />
                  <circle cx="32" cy="62" r="4" fill="#0284c7" />
                </svg>
              </div>
              <div className="iqraa-brand-text">
                <div className="iqraa-title">IQRÁA</div>
                <div className="iqraa-subtitle">• HOSPITAL</div>
              </div>
            </div>

            {/* Document Title */}
            <div className="doc-main-title">
              TRAINEE'S ASSESMENT FORM
            </div>

            {/* Document Reference Code Box */}
            <div className="doc-code-box">
              IIHRC/HRD/0007
            </div>
          </div>

          {/* Section 1: Trainee Employee Details (2-Column Bordered Grid) */}
          <table className="form-grid-table">
            <tbody>
              <tr>
                <td className="grid-cell" style={{ width: '50%' }}>
                  <span className="cell-label">TRAINEE CODE:</span>
                  <span className="cell-value">{traineeData.trainee_code || '-'}</span>
                </td>
                <td className="grid-cell" style={{ width: '50%' }}>
                  <span className="cell-label">DEPARTMENT :</span>
                  <span className="cell-value">{traineeData.department || '-'}</span>
                </td>
              </tr>
              <tr>
                <td className="grid-cell">
                  <span className="cell-label">NAME:</span>
                  <span className="cell-value" style={{ fontWeight: '700' }}>{traineeData.name || '-'}</span>
                </td>
                <td className="grid-cell">
                  <span className="cell-label">LOCATION:</span>
                  <span className="cell-value">{traineeData.location || traineeData.branch || '-'}</span>
                </td>
              </tr>
              <tr>
                <td className="grid-cell">
                  <span className="cell-label">DESIGNATION:</span>
                  <span className="cell-value">{traineeData.designation || '-'}</span>
                </td>
                <td className="grid-cell">
                  <span className="cell-label">TRAINING PERIOD :</span>
                  <span className="cell-value">{traineeData.training_period || '1 Month'}</span>
                </td>
              </tr>
              <tr>
                <td className="grid-cell">
                  <span className="cell-label">JOINING DATE:</span>
                  <span className="cell-value">{traineeData.joining_date || '-'}</span>
                </td>
                <td className="grid-cell">
                  <span className="cell-label">TRAINING COMPLETION DATE:</span>
                  <span className="cell-value">{traineeData.training_completion_date || '-'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Section 2: Instructions to Evaluator Banner */}
          <div className="instructions-banner">
            <strong>Instructions to Evaluator:</strong> Trainees should be continuously evaluated during the Training period. And the assessment form should be submitted exactly on or before the date of completion of training .Mark the trainee's performance based on evaluation scale.
          </div>

          {/* Section 3: Attributes Scoring Table */}
          <table className="attributes-table">
            <thead>
              <tr>
                <th style={{ width: '6%', textAlign: 'center' }}>Sl<br/>No</th>
                <th style={{ width: '54%', textAlign: 'left', paddingLeft: '8px' }}>ATTRIBUTES</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Excellent</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Good</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Average</th>
                <th style={{ width: '10%', textAlign: 'center' }}>poor</th>
              </tr>
              <tr className="points-subrow">
                <td></td>
                <td style={{ textAlign: 'left', paddingLeft: '8px', fontWeight: 'bold' }}>
                  Points ─────────────────────────&gt;
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>3</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>2</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>1</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>0</td>
              </tr>
            </thead>
            <tbody>
              {ATTRIBUTES.map((attr) => {
                const currentScore = scores[attr.id];
                return (
                  <tr key={attr.id} className="attribute-row">
                    <td style={{ textAlign: 'center', fontWeight: '600' }}>{attr.sl}</td>
                    <td style={{ textAlign: 'left', paddingLeft: '8px', fontWeight: '500' }}>{attr.label}</td>
                    
                    {/* Excellent (3) */}
                    <td 
                      className={`score-cell ${currentScore === 3 ? 'selected' : ''}`}
                      onClick={() => handleScoreSelect(attr.id, 3)}
                    >
                      <input 
                        type="radio" 
                        name={`attr_${attr.id}`} 
                        value="3" 
                        checked={currentScore === 3}
                        onChange={() => handleScoreSelect(attr.id, 3)}
                        className="no-print radio-input"
                      />
                      <span className="print-mark">{currentScore === 3 ? '✔' : ''}</span>
                    </td>

                    {/* Good (2) */}
                    <td 
                      className={`score-cell ${currentScore === 2 ? 'selected' : ''}`}
                      onClick={() => handleScoreSelect(attr.id, 2)}
                    >
                      <input 
                        type="radio" 
                        name={`attr_${attr.id}`} 
                        value="2" 
                        checked={currentScore === 2}
                        onChange={() => handleScoreSelect(attr.id, 2)}
                        className="no-print radio-input"
                      />
                      <span className="print-mark">{currentScore === 2 ? '✔' : ''}</span>
                    </td>

                    {/* Average (1) */}
                    <td 
                      className={`score-cell ${currentScore === 1 ? 'selected' : ''}`}
                      onClick={() => handleScoreSelect(attr.id, 1)}
                    >
                      <input 
                        type="radio" 
                        name={`attr_${attr.id}`} 
                        value="1" 
                        checked={currentScore === 1}
                        onChange={() => handleScoreSelect(attr.id, 1)}
                        className="no-print radio-input"
                      />
                      <span className="print-mark">{currentScore === 1 ? '✔' : ''}</span>
                    </td>

                    {/* Poor (0) */}
                    <td 
                      className={`score-cell ${currentScore === 0 ? 'selected' : ''}`}
                      onClick={() => handleScoreSelect(attr.id, 0)}
                    >
                      <input 
                        type="radio" 
                        name={`attr_${attr.id}`} 
                        value="0" 
                        checked={currentScore === 0}
                        onChange={() => handleScoreSelect(attr.id, 0)}
                        className="no-print radio-input"
                      />
                      <span className="print-mark">{currentScore === 0 ? '✔' : ''}</span>
                    </td>
                  </tr>
                );
              })}

              {/* Total Score Summary Row */}
              <tr className="total-score-row">
                <td colSpan="2" style={{ textAlign: 'left', paddingLeft: '16px', fontWeight: 'bold' }}>
                  Total Rating Score : &nbsp;&nbsp;&nbsp;
                  <span className="score-badge">{totalScore}</span> &nbsp;/ 30
                  <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '12px' }}>
                    ({percentage}% — {performanceGrade})
                  </span>
                </td>
                <td colSpan="4" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>
                  Calculated Score
                </td>
              </tr>

              {/* Grading Legend Row */}
              <tr className="grading-legend-row">
                <td colSpan="6" style={{ textAlign: 'left', padding: '5px 8px', fontStyle: 'italic', fontSize: '10px' }}>
                  <span style={{ fontWeight: percentage >= 85 ? 'bold' : 'normal', color: percentage >= 85 ? '#047857' : 'inherit' }}>
                    85% -100%=Highly performed
                  </span>, &nbsp;
                  <span style={{ fontWeight: (percentage >= 70 && percentage < 85) ? 'bold' : 'normal', color: (percentage >= 70 && percentage < 85) ? '#1d4ed8' : 'inherit' }}>
                    70%-84%=Well performed
                  </span>, &nbsp;
                  <span style={{ fontWeight: (percentage >= 50 && percentage < 70) ? 'bold' : 'normal', color: (percentage >= 50 && percentage < 70) ? '#b45309' : 'inherit' }}>
                    50% -69%=Needs Improvement
                  </span>, &nbsp;
                  <span style={{ fontWeight: percentage < 50 ? 'bold' : 'normal', color: percentage < 50 ? '#b91c1c' : 'inherit' }}>
                    below 50%=Unsatisfactory
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Section 4: Signatures Section (Box 1) */}
          <div className="signatures-block">
            <table className="signatures-table">
              <tbody>
                <tr>
                  <td style={{ width: '65%', borderBottom: '1px solid #000' }}>
                    <span className="sig-label">Employee's signature:</span>
                    <input 
                      type="text" 
                      className="sig-input"
                      value={signatures.employee_signature}
                      onChange={(e) => setSignatures({ ...signatures, employee_signature: e.target.value })}
                      placeholder=""
                    />
                  </td>
                  <td style={{ width: '35%', borderBottom: '1px solid #000', borderLeft: '1px solid #000' }}>
                    <span className="sig-label">Date:</span>
                    <input 
                      type="date" 
                      className="sig-date-input"
                      value={signatures.employee_signature_date}
                      onChange={(e) => setSignatures({ ...signatures, employee_signature_date: e.target.value })}
                    />
                  </td>
                </tr>

                <tr>
                  <td style={{ borderBottom: '1px solid #000' }}>
                    <span className="sig-label">Immediate Manager's signature:</span>
                    <input 
                      type="text" 
                      className="sig-input"
                      value={signatures.immediate_manager_signature}
                      onChange={(e) => setSignatures({ ...signatures, immediate_manager_signature: e.target.value })}
                      placeholder=""
                    />
                  </td>
                  <td style={{ borderBottom: '1px solid #000', borderLeft: '1px solid #000' }}>
                    <span className="sig-label">Date:</span>
                    <input 
                      type="date" 
                      className="sig-date-input"
                      value={signatures.immediate_manager_date}
                      onChange={(e) => setSignatures({ ...signatures, immediate_manager_date: e.target.value })}
                    />
                  </td>
                </tr>

                <tr>
                  <td>
                    <span className="sig-label">Department Head's Signature:</span>
                    <input 
                      type="text" 
                      className="sig-input"
                      value={signatures.department_head_signature}
                      onChange={(e) => setSignatures({ ...signatures, department_head_signature: e.target.value })}
                      placeholder=""
                    />
                  </td>
                  <td style={{ borderLeft: '1px solid #000' }}>
                    <span className="sig-label">Date:</span>
                    <input 
                      type="date" 
                      className="sig-date-input"
                      value={signatures.department_head_date}
                      onChange={(e) => setSignatures({ ...signatures, department_head_date: e.target.value })}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 5: OFFICE USE ONLY Section (Box 2) */}
          <div className="office-use-block">
            <div className="office-header-label">OFFICE USE ONLY</div>
            <table className="signatures-table">
              <tbody>
                <tr>
                  <td style={{ width: '65%', borderBottom: '1px solid #000' }}>
                    <span className="sig-label">Authorized Signature</span>
                    <input 
                      type="text" 
                      className="sig-input"
                      value={signatures.authorized_signature_1}
                      onChange={(e) => setSignatures({ ...signatures, authorized_signature_1: e.target.value })}
                      placeholder=""
                    />
                  </td>
                  <td style={{ width: '35%', borderBottom: '1px solid #000', borderLeft: '1px solid #000' }}>
                    <span className="sig-label">Date:</span>
                    <input 
                      type="date" 
                      className="sig-date-input"
                      value={signatures.authorized_date_1}
                      onChange={(e) => setSignatures({ ...signatures, authorized_date_1: e.target.value })}
                    />
                  </td>
                </tr>

                <tr>
                  <td>
                    <span className="sig-label">Authorized Signature</span>
                    <input 
                      type="text" 
                      className="sig-input"
                      value={signatures.authorized_signature_2}
                      onChange={(e) => setSignatures({ ...signatures, authorized_signature_2: e.target.value })}
                      placeholder=""
                    />
                  </td>
                  <td style={{ borderLeft: '1px solid #000' }}>
                    <span className="sig-label">Date:</span>
                    <input 
                      type="date" 
                      className="sig-date-input"
                      value={signatures.authorized_date_2}
                      onChange={(e) => setSignatures({ ...signatures, authorized_date_2: e.target.value })}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Embedded CSS for Exact Visual & A4 Print Layout */}
      <style dangerouslySetInnerHTML={{ __html: `
        .trainee-assessment-wrapper {
          padding: 16px;
          background-color: var(--background-color, #f1f5f9);
          min-height: 100vh;
        }

        .toolbar-card {
          max-width: 800px;
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

        /* Signatures Section */
        .signatures-block {
          border: 1.5px solid #000000;
          margin-bottom: 8px;
        }

        .signatures-table {
          width: 100%;
          border-collapse: collapse;
        }

        .signatures-table td {
          padding: 5px 8px;
          font-size: 10px;
          vertical-align: middle;
        }

        .sig-label {
          font-weight: 700;
          margin-right: 6px;
        }

        .sig-input {
          border: none;
          border-bottom: 1px dotted #94a3b8;
          font-size: 10.5px;
          padding: 2px 4px;
          width: 55%;
          outline: none;
          background: transparent;
        }

        .sig-date-input {
          border: none;
          font-size: 10px;
          padding: 2px 4px;
          outline: none;
          background: transparent;
        }

        /* Office Use Block */
        .office-use-block {
          border: 1.5px solid #000000;
        }

        .office-header-label {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.5px;
          padding: 2px 8px;
          border-bottom: 1px solid #000000;
          background-color: #f8fafc;
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

          .sig-input {
            border-bottom: none !important;
          }

          /* Prevent awkward page breaks */
          table, tr, td, th, .signatures-block, .office-use-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );
}

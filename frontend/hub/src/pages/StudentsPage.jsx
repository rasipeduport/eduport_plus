import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Avatar from '@radix-ui/react-avatar';
import {
  Loader2, Search, Link2,
  Plus, X, ArrowUpDown, ChevronDown, ChevronRight
} from 'lucide-react';
import api from '../lib/api';
import NewInvitationModal from '../components/NewInvitationModal';
import StaffActionsDropdown from '../components/StaffActionsDropdown';

const MEET_PREFIX = 'https://meet.google.com/';

function extractMeetCode(link) {
  if (!link) return '';
  return link.startsWith(MEET_PREFIX) ? link.slice(MEET_PREFIX.length) : link;
}

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Table filters and visibility
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    avatar: true,
    email: true,
    student_code: true,
    full_name: true,
    status: true,
    mobile_number: true,
    remarks_for_mentor: true,
    mentor: true,
    tutor: true,
    country: true,
    state: true,
    school_name: true,
    grade: true,
    syllabus: true,
    admission_date: true,
    created_at: true,
    meet_link: true,
    total_class_quota: true,
  });

  // Collapsed states
  const [showExpired, setShowExpired] = useState(false);

  // Modal active states
  const [activeStudent, setActiveStudent] = useState(null);
  const [modalType, setModalType] = useState(null); // 'meet_link' | 'quota' | 'status' | 'history'
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Modal form states
  const [meetCode, setMeetCode] = useState('');
  const [additionalQuota, setAdditionalQuota] = useState('');
  const [statusVal, setStatusVal] = useState('active');
  const [statusNote, setStatusNote] = useState('');
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Sorting
  const [sortField, setSortField] = useState('student_code');
  const [sortAsc, setSortAsc] = useState(true);

  // Current logged in user context (role check)
  const [userRole, setUserRole] = useState('ADMIN');

  useEffect(() => {
    fetchUserRole();
    fetchStudents();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await api.get('/api/auth/me/');
      setUserRole(response.data.user?.role || 'ADMIN');
    } catch (err) {
      console.error('Failed to fetch user info', err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/students/');
      setStudents(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students list.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, student) => {
    setActiveStudent(student);
    setModalType(type);
    setModalError('');
    setSaving(false);

    if (type === 'meet_link') {
      setMeetCode(extractMeetCode(student.meet_link));
    } else if (type === 'quota') {
      setAdditionalQuota('');
    } else if (type === 'status') {
      setStatusVal(student.status || 'active');
      setStatusNote(student.status_note || '');
    } else if (type === 'history') {
      fetchHistory(student.id);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setActiveStudent(null);
    setModalError('');
    setHistoryLogs([]);
  };

  const fetchHistory = async (studentId) => {
    setHistoryLoading(true);
    setHistoryLogs([]);
    try {
      const res = await api.get(`/api/activity/?student_id=${studentId}`);
      setHistoryLogs(res.data.results || []);
    } catch (err) {
      setModalError('Failed to load history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveMeetLink = async (e) => {
    e.preventDefault();
    setSaving(true);
    setModalError('');
    const fullMeetLink = meetCode.trim() ? `${MEET_PREFIX}${meetCode.trim()}` : null;
    try {
      await api.put('/api/students/', {
        id: activeStudent.id,
        meet_link: fullMeetLink
      });
      fetchStudents();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save meet link.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuota = async (e) => {
    e.preventDefault();
    const quotaVal = parseInt(additionalQuota);
    if (isNaN(quotaVal) || quotaVal <= 0) {
      setModalError('Please enter a valid positive number of classes.');
      return;
    }
    setSaving(true);
    setModalError('');
    const newTotal = (activeStudent.total_class_quota || 0) + quotaVal;
    try {
      await api.put('/api/students/', {
        id: activeStudent.id,
        total_class_quota: newTotal
      });
      fetchStudents();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update class quota.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (statusVal !== 'active' && !statusNote.trim()) {
      setModalError('Reason / Note is required for inactive or expired status.');
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      await api.put('/api/students/', {
        id: activeStudent.id,
        status: statusVal,
        status_note: statusVal === 'active' ? null : statusNote.trim()
      });
      fetchStudents();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update student status.');
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Process sorting & filtering
  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeStudents = filteredStudents.filter(s => s.status !== 'expired');
  const expiredStudents = filteredStudents.filter(s => s.status === 'expired');

  const getSortedData = (dataList) => {
    return [...dataList].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle nested profile fields if sorted
      if (sortField === 'email') {
        valA = a.profile?.email || '';
        valB = b.profile?.email || '';
      }

      if (valA === null || valA === undefined) return sortAsc ? 1 : -1;
      if (valB === null || valB === undefined) return sortAsc ? -1 : 1;

      if (typeof valA === 'string') {
        return sortAsc
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortAsc ? valA - valB : valB - valA;
      }
    });
  };

  const renderStudentRow = (student) => {
    const initials = student.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'S';
    return (
      <tr
        key={student.id}
        className="group hover:bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.08)] h-[54px] transition-colors"
      >
        {visibleColumns.avatar && (
          <td className="py-2 px-4 align-middle">
            <Avatar.Root className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[rgba(255,255,255,0.1)]">
              <Avatar.Image
                src={student.profile?.avatar_url || undefined}
                alt={student.full_name}
                className="aspect-square h-full w-full object-cover"
              />
              <Avatar.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-[#374151] text-xs font-semibold text-white">
                {initials}
              </Avatar.Fallback>
            </Avatar.Root>
          </td>
        )}
        {visibleColumns.email && (
          <td className="py-2 px-4 text-[#a1a1aa] text-sm align-middle whitespace-nowrap">
            {student.profile?.email || '—'}
          </td>
        )}
        {visibleColumns.student_code && (
          <td className="py-2 px-4 font-mono text-xs text-[#a1a1aa] align-middle">{student.student_code}</td>
        )}
        {visibleColumns.full_name && (
          <td className="py-2 px-4 font-medium text-white text-sm align-middle whitespace-nowrap">{student.full_name}</td>
        )}
        {visibleColumns.status && (
          <td className="py-2 px-4 align-middle">
            {student.status === 'active' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-900/50">
                Active
              </span>
            ) : student.status === 'inactive' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-900/50" title={student.status_note}>
                Inactive
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-900/80 text-zinc-400 border border-zinc-800/80" title={student.status_note}>
                Expired
              </span>
            )}
          </td>
        )}
        {visibleColumns.mobile_number && (
          <td className="py-2 px-4 text-[#a1a1aa] text-sm align-middle whitespace-nowrap">{student.mobile_number || '—'}</td>
        )}
        {visibleColumns.remarks_for_mentor && (
          <td className="py-2 px-4 text-[#a1a1aa] text-sm align-middle max-w-[220px] truncate" title={student.remarks_for_mentor}>
            {student.remarks_for_mentor || '—'}
          </td>
        )}
        {visibleColumns.mentor && (
          <td className="py-2 px-4 text-sm text-[#e4e4e7] align-middle whitespace-nowrap">
            {student.mentor_profile?.full_name || student.mentor_profile?.email || 'Not Assigned'}
          </td>
        )}
        {visibleColumns.tutor && (
          <td className="py-2 px-4 text-sm text-[#e4e4e7] align-middle whitespace-nowrap">
            {student.tutor_profile?.full_name || student.tutor_profile?.email || 'Not Assigned'}
          </td>
        )}
        {visibleColumns.country && (
          <td className="py-2 px-4 text-[#a1a1aa] text-sm align-middle whitespace-nowrap">{student.country || '—'}</td>
        )}
        {visibleColumns.state && (
          <td className="py-2 px-4 text-[#a1a1aa] text-sm align-middle whitespace-nowrap">{student.state || '—'}</td>
        )}
        {visibleColumns.school_name && (
          <td className="py-2 px-4 text-[#a1a1aa] text-sm align-middle whitespace-nowrap max-w-[200px] truncate" title={student.school_name}>
            {student.school_name || '—'}
          </td>
        )}
        {visibleColumns.grade && (
          <td className="py-2 px-4 text-[#a1a1aa] text-sm align-middle whitespace-nowrap">{student.grade || '—'}</td>
        )}
        {visibleColumns.syllabus && (
          <td className="py-2 px-4 text-[#a1a1aa] text-sm align-middle whitespace-nowrap">{student.syllabus || '—'}</td>
        )}
        {visibleColumns.admission_date && (
          <td className="py-2 px-4 text-[#a1a1aa] text-sm align-middle whitespace-nowrap">
            {student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          </td>
        )}
        {visibleColumns.created_at && (
          <td className="py-2 px-4 text-[#a1a1aa] text-sm align-middle whitespace-nowrap">
            {new Date(student.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </td>
        )}
        {visibleColumns.meet_link && (
          <td className="py-2 px-4 text-zinc-400 text-sm align-middle whitespace-nowrap truncate max-w-[180px]">
            {student.meet_link ? (
              <a href={student.meet_link} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                {student.meet_link}
              </a>
            ) : '—'}
          </td>
        )}
        {visibleColumns.total_class_quota && (
          <td className="py-2 px-4 text-white text-sm align-middle text-center font-mono tabular-nums">{student.total_class_quota}</td>
        )}
        <td className="py-2 px-2 align-middle text-right sticky right-0 bg-[#0a0a0a] group-hover:bg-[#111] border-l border-[rgba(255,255,255,0.08)] transition-colors z-10">
          <StaffActionsDropdown
            items={[
              { label: 'Edit Profile', onClick: () => {}, disabled: true },
              { label: userRole === 'TUTOR' ? 'View Sessions' : 'Manage Sessions', onClick: () => window.location.href = `/sessions?student_id=${student.id}` },
              ...(userRole !== 'TUTOR' ? [
                { label: 'Edit Meet Link', onClick: () => openModal('meet_link', student) },
                { label: 'Top-up Class Quota', onClick: () => openModal('quota', student) },
                { label: 'Change Status', onClick: () => openModal('status', student) },
              ] : []),
              ...(userRole === 'ADMIN' ? [
                { label: 'View History', onClick: () => openModal('history', student) },
              ] : []),
            ]}
          />
        </td>
      </tr>
    );
  };

  const toggleColumn = (col) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full box-border">
      {/* Header and filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
              className="h-10 px-4 bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm font-medium hover:bg-zinc-900 transition-colors flex items-center gap-2 text-zinc-300 hover:text-white"
            >
              Columns
              <ChevronDown className="w-4 h-4" />
            </button>

            {showColumnsDropdown && (
              <div className="absolute left-0 mt-1.5 w-56 bg-[#121214] border border-[#1e1e24] rounded-xl shadow-xl py-2 z-50 max-h-80 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-[#1e1e24]/70 mb-2">
                  Toggle Columns
                </div>
                {Object.keys(visibleColumns).map(col => (
                  <label
                    key={col}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-xs text-zinc-300 hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={() => toggleColumn(col)}
                      className="rounded border-zinc-700 bg-zinc-950 text-white focus:ring-white/20"
                    />
                    <span className="capitalize">{col.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {userRole !== 'TUTOR' && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="h-10 px-4 bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2 self-stretch sm:self-auto shrink-0 justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Student
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 text-red-400 text-xs p-3 rounded-lg border border-red-900/50">
          {error}
        </div>
      )}

      {/* Main Students Table */}
      <div className="border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] rounded-xl shadow-xl overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[#0f0f0f]">
                {visibleColumns.avatar && <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle w-10"></th>}
                {visibleColumns.email && (
                  <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">
                    <button onClick={() => handleSort('email')} className="flex items-center gap-1 hover:text-white">
                      Email
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}

                {visibleColumns.student_code && (
                  <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">
                    <button onClick={() => handleSort('student_code')} className="flex items-center gap-1 hover:text-white">
                      Student ID
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}
                {visibleColumns.full_name && (
                  <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">
                    <button onClick={() => handleSort('full_name')} className="flex items-center gap-1 hover:text-white">
                      Name
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">Status</th>
                )}
                {visibleColumns.mobile_number && <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">Mobile</th>}
                {visibleColumns.remarks_for_mentor && <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">Remarks for Mentor</th>}
                {visibleColumns.mentor && <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">Mentor</th>}
                {visibleColumns.tutor && <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">Tutor</th>}
                {visibleColumns.country && <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">Country</th>}
                {visibleColumns.state && <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">State</th>}
                {visibleColumns.school_name && <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">School</th>}
                {visibleColumns.grade && <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">Grade</th>}
                {visibleColumns.syllabus && <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">Syllabus</th>}

                {visibleColumns.admission_date && (
                  <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">
                    <button onClick={() => handleSort('admission_date')} className="flex items-center gap-1 hover:text-white">
                      Admission Date
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}
                {visibleColumns.created_at && (
                  <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">
                    <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 hover:text-white">
                      Joined At
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}
                {visibleColumns.meet_link && <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle">Meet Link</th>}

                {visibleColumns.total_class_quota && (
                  <th className="h-12 px-4 font-semibold text-xs text-zinc-400 align-middle text-center">
                    <button onClick={() => handleSort('total_class_quota')} className="flex items-center gap-1 mx-auto hover:text-white">
                      Class Quota
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                )}
                <th className="h-12 px-2 w-10 sticky right-0 bg-[#0f0f0f] border-l border-[rgba(255,255,255,0.08)] z-20"></th>
              </tr>
            </thead>
            <tbody>
              {activeStudents.length === 0 ? (
                <tr>
                  <td colSpan="100%" className="py-8 text-center text-zinc-500 text-sm">
                    No active students found matching criteria.
                  </td>
                </tr>
              ) : (
                getSortedData(activeStudents).map(renderStudentRow)
              )}
            </tbody>
          </table>
      </div>

       Expired Students Section 
      {userRole !== 'TUTOR' && (
        <div className="border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] rounded-xl shadow-xl mt-2">
          <button
            onClick={() => setShowExpired(!showExpired)}
            className="w-full flex items-center justify-between p-4 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900/30 transition-all border-none outline-none cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {showExpired ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Expired Students ({expiredStudents.length})
            </div>
          </button>

          {showExpired && (
            <div className="overflow-x-auto border-t border-[rgba(255,255,255,0.08)] bg-black/25 rounded-b-xl">
              <table className="w-full text-left border-collapse text-sm">
                <tbody>
                  {expiredStudents.length === 0 ? (
                    <tr>
                      <td className="py-6 text-center text-zinc-500 text-sm">
                        No expired students found.
                      </td>
                    </tr>
                  ) : (
                    getSortedData(expiredStudents).map(renderStudentRow)
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals & Sheets Overlay */}
      {modalType && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
          {modalType === 'meet_link' && (
            <div className="w-full max-w-sm bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
              <h3 className="text-base font-semibold text-white m-0">Edit Meet Link</h3>
              <p className="text-xs text-zinc-400 mt-1 mb-6">{activeStudent?.full_name}</p>

              <form onSubmit={handleSaveMeetLink} className="space-y-4">
                {modalError && <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-900/50 m-0">{modalError}</p>}

                <div className="space-y-2">
                  <label htmlFor="meet-code" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Google Meet Link</label>
                  <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-white/20 transition-all">
                    <span className="bg-white/10 text-zinc-400 text-xs px-3 py-2 border-r border-white/10 select-none whitespace-nowrap">
                      meet.google.com/
                    </span>
                    <input
                      id="meet-code"
                      type="text"
                      value={meetCode}
                      onChange={(e) => setMeetCode(e.target.value)}
                      placeholder="abc-defg-hij"
                      className="w-full px-3 py-2 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"
                      disabled={saving}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-1.5"
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Save Link
                  </button>
                </div>
              </form>
            </div>
          )}

          {modalType === 'quota' && (
            <div className="w-full max-w-sm bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
              <h3 className="text-base font-semibold text-white m-0">Top-up Class Quota</h3>
              <p className="text-xs text-zinc-400 mt-1 mb-6">Manage session balance for {activeStudent?.full_name}</p>

              <form onSubmit={handleSaveQuota} className="space-y-5">
                {modalError && <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-900/50 m-0">{modalError}</p>}

                <div className="space-y-1.5 text-xs text-zinc-400">
                  <p className="m-0 flex items-center justify-between border-b border-white/10 pb-2">
                    <span>Total classes purchased:</span>
                    <span className="text-white font-mono font-semibold text-sm">{activeStudent?.total_class_quota ?? 0}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="topup-val" className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex-1">Add classes</label>
                  <input
                    id="topup-val"
                    type="number"
                    min="1"
                    placeholder="0"
                    value={additionalQuota}
                    onChange={(e) => setAdditionalQuota(e.target.value)}
                    className="w-20 px-3 py-1.5 text-right bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    disabled={saving}
                    required
                  />
                </div>

                <div className="space-y-1.5 text-xs text-zinc-400 border-t border-white/10 pt-3">
                  <p className="m-0 flex items-center justify-between">
                    <span>Updated total quota:</span>
                    <span className="text-emerald-400 font-mono font-semibold text-sm">
                      {(activeStudent?.total_class_quota ?? 0) + (parseInt(additionalQuota) || 0)}
                    </span>
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-1.5"
                    disabled={saving || !additionalQuota}
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Confirm Top-up
                  </button>
                </div>
              </form>
            </div>
          )}

          {modalType === 'status' && (
            <div className="w-full max-w-sm bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
              <h3 className="text-base font-semibold text-white m-0">Change Student Status</h3>
              <p className="text-xs text-zinc-400 mt-1 mb-6">Update membership status for {activeStudent?.full_name}</p>

              <form onSubmit={handleSaveStatus} className="space-y-4">
                {modalError && <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-900/50 m-0">{modalError}</p>}

                <div className="space-y-1.5">
                  <label htmlFor="status-sel" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Status</label>
                  <select
                    id="status-sel"
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    disabled={saving}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                {statusVal !== 'active' && (
                  <div className="space-y-1.5">
                    <label htmlFor="status-note" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Reason / Note</label>
                    <input
                      id="status-note"
                      type="text"
                      placeholder="e.g. Course completed, unpaid fees..."
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20"
                      disabled={saving}
                      required
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-1.5"
                    disabled={saving || (statusVal !== 'active' && !statusNote.trim())}
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Save Status
                  </button>
                </div>
              </form>
            </div>
          )}

          {modalType === 'history' && (
            <div className="fixed inset-y-0 right-0 w-full sm:max-w-lg bg-[#121212] border-l border-white/10 shadow-2xl flex flex-col z-50">
              <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white m-0">Activity History</h3>
                  <span className="text-[11px] text-zinc-400">Changes to {activeStudent?.full_name} and their sessions</span>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {modalError && (
                  <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded border border-red-900/50">{modalError}</p>
                )}

                {historyLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                ) : historyLogs.length === 0 ? (
                  <p className="text-zinc-500 text-center py-12 text-sm">No activity recorded yet.</p>
                ) : (
                  <ol className="relative border-l border-zinc-800 m-0 p-0 pl-4 space-y-5">
                    {historyLogs.map(log => {
                      const hasChanges = Object.keys(log.changes || {}).length > 0;
                      const isExpanded = expandedLogId === log.id;

                      // Format human-friendly descriptions
                      let description = log.action;
                      if (log.action === 'student.create') description = 'Added the student';
                      else if (log.action === 'student.update_status') {
                        const oldS = log.changes?.status?.old || 'None';
                        const newS = log.changes?.status?.new || 'None';
                        const note = log.changes?.status_note?.new;
                        description = `Changed status from "${oldS}" to "${newS}"${note ? ` (${note})` : ''}`;
                      }
                      else if (log.action === 'student.update_quota') {
                        const oldQ = log.changes?.total_class_quota?.old ?? 0;
                        const newQ = log.changes?.total_class_quota?.new ?? 0;
                        description = `Changed class quota from ${oldQ} to ${newQ}`;
                      }
                      else if (log.action === 'student.update_meet_link') description = 'Updated meet link';
                      else if (log.action === 'LOGIN') description = 'Logged in';
                      else if (log.action === 'LOGOUT') description = 'Logged out';

                      return (
                        <li key={log.id} className="relative">
                          <span className="absolute -left-[21px] top-1.5 flex h-2 w-2 rounded-full bg-zinc-400 ring-4 ring-black"></span>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white">
                                {log.actor_name || log.actor_email || 'System'}
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className="text-xs text-zinc-400 m-0 leading-relaxed">{description}</p>

                            {hasChanges && (
                              <button
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="text-[10px] text-zinc-400 hover:text-white font-semibold self-start flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                {isExpanded ? 'Hide changes' : 'Show details'}
                                <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}

                            {isExpanded && hasChanges && (
                              <div className="mt-2 bg-white/[0.03] border border-white/10 rounded-lg p-2.5 space-y-1.5 divide-y divide-white/5 text-[11px]">
                                {Object.entries(log.changes).map(([field, delta]) => (
                                  <div key={field} className="grid grid-cols-[80px_1fr] gap-2 pt-1.5 first:pt-0">
                                    <span className="text-zinc-500 font-medium capitalize">{field.replace(/_/g, ' ')}</span>
                                    <span className="text-zinc-300 flex items-center gap-1.5 flex-wrap">
                                      <span className="line-through text-zinc-500">{String(delta.old ?? '—')}</span>
                                      <span>→</span>
                                      <span className="text-white font-medium">{String(delta.new ?? '—')}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <NewInvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        initialRole="STUDENT"
        onSuccess={fetchStudents}
      />
    </div>
  );
}

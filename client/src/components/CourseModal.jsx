import { useState } from 'react';
import { Award, BookOpen, Calendar, ExternalLink, Link2, UploadCloud, X } from 'lucide-react';
import { courseApi } from '../services/api';

const POPULAR_PLATFORMS = [
  'Coursera',
  'Udemy',
  'LinkedIn Learning',
  'edX',
  'AWS Training',
  'Google Cloud Skills',
  'Pluralsight',
  'Codecademy',
  'Other',
];

export default function CourseModal({ course, onClose, onSuccess }) {
  const isEditing = Boolean(course);

  const [title, setTitle] = useState(course?.title || '');
  const [platform, setPlatform] = useState(course?.platform || 'Coursera');
  const [customPlatform, setCustomPlatform] = useState('');
  const [courseUrl, setCourseUrl] = useState(course?.courseUrl || '');
  const [startDate, setStartDate] = useState(course?.startDate ? new Date(course.startDate).toISOString().slice(0, 10) : '');
  const [endDate, setEndDate] = useState(course?.endDate ? new Date(course.endDate).toISOString().slice(0, 10) : '');
  const [progress, setProgress] = useState(course?.progress ?? 0);
  const [status, setStatus] = useState(course?.status || 'enrolled');

  // Certificate fields
  const [certType, setCertType] = useState(course?.certificateType === 'file' ? 'file' : 'url');
  const [certUrl, setCertUrl] = useState(course?.certificateUrl || '');
  const [certFileName, setCertFileName] = useState(course?.certificateFileName || '');
  const [fileError, setFileError] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleProgressChange = (val) => {
    const num = Math.max(0, Math.min(100, Number(val) || 0));
    setProgress(num);
    if (num === 100) {
      setStatus('completed');
    } else if (num > 0 && status === 'enrolled') {
      setStatus('in-progress');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    setFileError('');
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCertUrl(reader.result);
      setCertFileName(file.name);
    };
    reader.onerror = () => {
      setFileError('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      return setError('Course title is required.');
    }

    const effectivePlatform = platform === 'Other' ? (customPlatform.trim() || 'Other') : platform;
    if (!effectivePlatform) {
      return setError('Platform / Provider is required.');
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        platform: effectivePlatform,
        courseUrl: courseUrl.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        progress: Number(progress),
        status,
        certificateType: certUrl.trim() ? certType : 'none',
        certificateUrl: certUrl.trim(),
        certificateFileName: certFileName.trim(),
      };

      if (isEditing) {
        await courseApi.update(course._id, payload);
      } else {
        await courseApi.create(payload);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save course.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {isEditing ? 'Update Course & Progress' : 'Add New Course'}
              </h3>
              <p className="text-xs text-slate-500">
                Track your learning milestones and submit completion credentials
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Course Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Course Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete Web Development Bootcamp, AWS Solutions Architect..."
              className="mt-1 sp-input"
            />
          </div>

          {/* Platform / Provider */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Platform / Provider <span className="text-rose-500">*</span>
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="mt-1 sp-input"
              >
                {POPULAR_PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {platform === 'Other' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Custom Provider
                </label>
                <input
                  type="text"
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                  placeholder="e.g. FreeCodeCamp, University"
                  className="mt-1 sp-input"
                />
              </div>
            )}

            <div className={platform === 'Other' ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Course Link (URL)
              </label>
              <div className="relative mt-1">
                <input
                  type="url"
                  value={courseUrl}
                  onChange={(e) => setCourseUrl(e.target.value)}
                  placeholder="https://..."
                  className="sp-input pl-8"
                />
                <ExternalLink size={14} className="absolute left-2.5 top-3 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 sp-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Target / End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 sp-input"
              />
            </div>
          </div>

          {/* Progress & Status */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Self-Reported Progress
              </label>
              <span className="text-sm font-bold text-indigo-600">{progress}%</span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => handleProgressChange(e.target.value)}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => handleProgressChange(e.target.value)}
                className="w-16 sp-input text-center font-semibold text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="text-xs font-medium text-slate-600">Course Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  if (e.target.value === 'completed' && progress < 100) setProgress(100);
                }}
                className="sp-input text-xs w-36"
              >
                <option value="enrolled">Enrolled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed (100%)</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
          </div>

          {/* Certificate Evidence Section */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                <Award size={15} />
                <span>Certificate Submission</span>
              </div>
              {course?.verificationStatus && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  course.verificationStatus === 'verified'
                    ? 'bg-emerald-100 text-emerald-800'
                    : course.verificationStatus === 'pending_review'
                    ? 'bg-amber-100 text-amber-800'
                    : course.verificationStatus === 'rejected'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {course.verificationStatus.replace('_', ' ')}
                </span>
              )}
            </div>

            <div className="flex gap-4 text-xs font-medium text-slate-600">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="certType"
                  value="url"
                  checked={certType === 'url'}
                  onChange={() => setCertType('url')}
                  className="accent-indigo-600"
                />
                Verification Link / URL
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="certType"
                  value="file"
                  checked={certType === 'file'}
                  onChange={() => setCertType('file')}
                  className="accent-indigo-600"
                />
                Upload File (PDF / Image)
              </label>
            </div>

            {certType === 'url' ? (
              <div>
                <input
                  type="url"
                  value={certUrl}
                  onChange={(e) => setCertUrl(e.target.value)}
                  placeholder="https://coursera.org/verify/... or https://credly.com/badges/..."
                  className="sp-input text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Provide verifiable online certificate or badge URL.
                </p>
              </div>
            ) : (
              <div>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-3 cursor-pointer hover:border-indigo-300 hover:bg-white transition-colors">
                  <UploadCloud size={22} className="text-slate-400" />
                  <span className="mt-1 text-xs text-slate-600 font-medium">
                    {certFileName ? certFileName : 'Click to select PDF or image (max 5MB)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {fileError && <p className="mt-1 text-[11px] text-rose-600">{fileError}</p>}
                {certFileName && (
                  <div className="mt-1.5 flex items-center justify-between text-xs text-slate-600 bg-white p-1.5 rounded border border-slate-100">
                    <span className="truncate max-w-[280px] font-medium">{certFileName}</span>
                    <button
                      type="button"
                      onClick={() => { setCertUrl(''); setCertFileName(''); }}
                      className="text-rose-500 hover:underline text-[11px]"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-[11px] text-slate-500">
              Note: Submitted certificates are reviewed and verified by the Admin before being confirmed.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="sp-btn sp-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="sp-btn sp-btn-primary"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

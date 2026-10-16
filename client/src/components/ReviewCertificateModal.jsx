import { useState } from 'react';
import { Award, CheckCircle2, ExternalLink, FileText, XCircle, X } from 'lucide-react';
import { courseApi } from '../services/api';

export default function ReviewCertificateModal({ course, onClose, onSuccess }) {
  const [decision, setDecision] = useState(
    course?.verificationStatus === 'rejected' ? 'rejected' : 'verified'
  );
  const [remarks, setRemarks] = useState(course?.verificationRemarks || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isDataUrl = course?.certificateUrl?.startsWith('data:');
  const isPdf = isDataUrl && (course?.certificateUrl?.includes('application/pdf') || course?.certificateFileName?.endsWith('.pdf'));
  const isImage = isDataUrl && (course?.certificateUrl?.includes('image/') || /\.(png|jpe?g|webp|gif)$/i.test(course?.certificateFileName || ''));

  const handleOpenCertificate = () => {
    if (!course?.certificateUrl) return;
    if (isDataUrl) {
      const win = window.open();
      if (win) {
        if (isPdf) {
          win.document.write(
            `<iframe src="${course.certificateUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
          );
        } else {
          win.document.write(`<img src="${course.certificateUrl}" style="max-width:100%; height:auto;" alt="Certificate" />`);
        }
      }
    } else {
      window.open(course.certificateUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (decision === 'rejected' && !remarks.trim()) {
      return setError('Please provide feedback/remarks explaining why the certificate was rejected.');
    }

    setSaving(true);
    setError('');

    try {
      await courseApi.verify(course._id, {
        verificationStatus: decision,
        verificationRemarks: remarks.trim(),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update certificate verification status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Award size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Review Certificate</h3>
              <p className="text-xs text-slate-500">
                Audit credential evidence and verify course completion
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

        <div className="mt-4 space-y-4">
          {/* Employee & Course Overview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase">Employee</span>
              <span className="font-bold text-slate-800">
                {course.employee?.name || course.employeeName} ({course.employeeId})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase">Course</span>
              <span className="font-semibold text-slate-900">{course.title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase">Platform</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-100 text-indigo-700">
                {course.platform}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase">Progress</span>
              <span className="font-bold text-emerald-600">{course.progress}% (Self-Reported)</span>
            </div>
            {course.certificateSubmittedAt && (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500 uppercase">Submitted At</span>
                <span className="text-slate-600">
                  {new Date(course.certificateSubmittedAt).toLocaleDateString()} {new Date(course.certificateSubmittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>

          {/* Certificate Evidence Box */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-2">
              Submitted Certificate Evidence
            </p>

            {course.certificateUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 truncate">
                    {isPdf ? <FileText size={16} className="text-rose-500" /> : <Award size={16} className="text-indigo-600" />}
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[280px]">
                      {course.certificateFileName || (isDataUrl ? 'Certificate Document' : course.certificateUrl)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCertificate}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>View</span>
                    <ExternalLink size={13} />
                  </button>
                </div>

                {isImage && (
                  <div className="mt-2 text-center">
                    <img
                      src={course.certificateUrl}
                      alt="Certificate Preview"
                      className="max-h-48 mx-auto rounded border border-slate-200 object-contain shadow-sm cursor-pointer"
                      onClick={handleOpenCertificate}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Click image to enlarge</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No certificate file or link attached.</p>
            )}
          </div>

          {/* Admin Decision Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Verification Action
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all ${
                    decision === 'verified'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="verified"
                    checked={decision === 'verified'}
                    onChange={() => setDecision('verified')}
                    className="sr-only"
                  />
                  <CheckCircle2 size={16} className={decision === 'verified' ? 'text-emerald-600' : 'text-slate-400'} />
                  Verify Certificate
                </label>

                <label
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all ${
                    decision === 'rejected'
                      ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="rejected"
                    checked={decision === 'rejected'}
                    onChange={() => setDecision('rejected')}
                    className="sr-only"
                  />
                  <XCircle size={16} className={decision === 'rejected' ? 'text-rose-600' : 'text-slate-400'} />
                  Reject Certificate
                </label>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Verification Remarks / Feedback {decision === 'rejected' && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={decision === 'verified' ? 'e.g. Credential verified via issuer verification page' : 'e.g. Certificate link was unreachable or incomplete'}
                className="mt-1.5 sp-input resize-none text-xs"
              />
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
                className={`sp-btn ${decision === 'verified' ? 'sp-btn-primary' : 'bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 py-2 rounded-lg text-xs'}`}
              >
                {saving ? 'Saving...' : decision === 'verified' ? 'Approve & Verify' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

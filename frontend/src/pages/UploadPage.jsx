import React, { useState } from "react";
import { Upload, CheckCircle, AlertTriangle, FileText } from "lucide-react";
import { uploadDatasets } from "../api";
import { AlertBox, Spinner } from "../components/UI";

function FileDropZone({ label, accept, file, onChange }) {
  const [dragging, setDragging] = useState(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  };
  return (
    <label
      className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200
        ${dragging ? "border-primary-500 bg-primary-500/10" : "border-slate-600 hover:border-primary-500/60 hover:bg-slate-800/50"}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input type="file" className="hidden" accept={accept} onChange={e => onChange(e.target.files[0])} />
      {file ? (
        <>
          <FileText className="w-10 h-10 text-primary-400 mb-2" />
          <p className="text-white font-medium text-sm">{file.name}</p>
          <p className="text-slate-500 text-xs mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
        </>
      ) : (
        <>
          <Upload className="w-10 h-10 text-slate-500 mb-2" />
          <p className="text-slate-400 text-sm font-medium">{label}</p>
          <p className="text-slate-600 text-xs mt-1">Drag & drop or click to browse</p>
        </>
      )}
    </label>
  );
}

export default function UploadPage() {
  const [trueFile, setTrueFile] = useState(null);
  const [fakeFile, setFakeFile] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState("");
  const [error, setError]       = useState("");

  const handleUpload = async () => {
    if (!trueFile && !fakeFile) { setError("Select at least one file."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await uploadDatasets(trueFile, fakeFile);
      setSuccess(`Uploaded successfully: ${res.files.join(", ")}`);
      setTrueFile(null); setFakeFile(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div>
        <h1 className="section-title flex items-center gap-2">
          <Upload className="w-6 h-6 text-primary-400" /> Upload Dataset
        </h1>
        <p className="section-sub">Upload True.csv and Fake.csv to replace the existing dataset files.</p>
      </div>

      <div className="card p-6 space-y-5">
        <div>
          <p className="text-sm text-slate-400 mb-2">True News CSV (True.csv)</p>
          <FileDropZone label="Drop True.csv here" accept=".csv" file={trueFile} onChange={setTrueFile} />
        </div>
        <div>
          <p className="text-sm text-slate-400 mb-2">Fake News CSV (Fake.csv)</p>
          <FileDropZone label="Drop Fake.csv here" accept=".csv" file={fakeFile} onChange={setFakeFile} />
        </div>

        <button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={handleUpload}
          disabled={loading || (!trueFile && !fakeFile)}
        >
          {loading ? <><Spinner size={4} /> Uploading…</> : <><Upload className="w-4 h-4" /> Upload Files</>}
        </button>

        {success && <AlertBox type="success"><CheckCircle className="inline w-4 h-4 mr-1" />{success}</AlertBox>}
        {error   && <AlertBox type="error"><AlertTriangle className="inline w-4 h-4 mr-1" />{error}</AlertBox>}
      </div>

      {/* Format guide */}
      <div className="card p-5">
        <h2 className="font-semibold text-white mb-3">Expected CSV Format</h2>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="border-b border-slate-700">
                {["Column","Type","Description"].map(h=>(
                  <th key={h} className="text-left pb-2 pr-4 text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["title","string","Article headline"],
                ["text","string","Full article body"],
                ["subject","string","Category (optional)"],
                ["date","string","Publication date (optional)"],
              ].map(([col,type,desc])=>(
                <tr key={col} className="border-b border-slate-800">
                  <td className="py-2 pr-4 font-mono text-primary-400">{col}</td>
                  <td className="py-2 pr-4 text-slate-400">{type}</td>
                  <td className="py-2 text-slate-400">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          After uploading, go to the <strong className="text-slate-300">Training</strong> page to retrain the model.
        </p>
      </div>
    </div>
  );
}

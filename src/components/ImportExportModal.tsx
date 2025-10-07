import { useState, useRef } from 'react';
import { X, Download, Upload, FileJson, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { Task } from '../types';
import { exportToJSON, exportToCSV, downloadFile, getExportFilename } from '../utils/dataExport';
import { importFromJSON, importFromCSV, detectFileType, ImportResult } from '../utils/dataImport';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onImport: (tasks: Task[], mode: 'merge' | 'replace') => void;
}

type Tab = 'export' | 'import';
type ExportFormat = 'json' | 'csv';
type ImportMode = 'merge' | 'replace';

export default function ImportExportModal({ isOpen, onClose, tasks, onImport }: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('export');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const content = exportFormat === 'json' ? exportToJSON(tasks) : exportToCSV(tasks);
    const mimeType = exportFormat === 'json' ? 'application/json' : 'text/csv';
    const filename = getExportFilename(exportFormat);

    downloadFile(content, filename, mimeType);
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setImportResult(null);

    try {
      const fileType = detectFileType(file);

      if (fileType === 'unknown') {
        setImportResult({
          success: false,
          error: '不支持的文件格式，请选择 JSON 或 CSV 文件'
        });
        return;
      }

      const result = fileType === 'json'
        ? await importFromJSON(file)
        : await importFromCSV(file);

      setImportResult(result);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleImportConfirm = () => {
    if (importResult?.success && importResult.tasks) {
      onImport(importResult.tasks, importMode);
      setImportResult(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">导入 / 导出</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'export'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Download size={18} />
              <span>导出</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'import'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Upload size={18} />
              <span>导入</span>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'export' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  选择导出格式
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setExportFormat('json')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      exportFormat === 'json'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FileJson size={32} className={`mx-auto mb-2 ${
                      exportFormat === 'json' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="font-medium text-gray-800">JSON</div>
                    <div className="text-xs text-gray-500 mt-1">完整数据</div>
                  </button>
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      exportFormat === 'csv'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FileSpreadsheet size={32} className={`mx-auto mb-2 ${
                      exportFormat === 'csv' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="font-medium text-gray-800">CSV</div>
                    <div className="text-xs text-gray-500 mt-1">Excel 兼容</div>
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>任务总数：</span>
                    <span className="font-bold text-gray-800">{tasks.length}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {exportFormat === 'json'
                      ? '导出为 JSON 格式将保留所有任务数据，包括标签、优先级、描述等完整信息。'
                      : '导出为 CSV 格式可在 Excel 中打开编辑，适合批量查看和修改任务。'
                    }
                  </div>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={tasks.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download size={20} />
                <span>下载文件</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  导入模式
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setImportMode('merge')}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      importMode === 'merge'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-800">合并</div>
                    <div className="text-xs text-gray-500 mt-1">保留现有任务并添加新任务</div>
                  </button>
                  <button
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      importMode === 'replace'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-800">替换</div>
                    <div className="text-xs text-gray-500 mt-1">清空现有任务并导入新任务</div>
                  </button>
                </div>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <Upload size={48} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 mb-2">拖放文件到此处或</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  选择文件
                </button>
                <p className="text-xs text-gray-500 mt-3">支持 JSON 和 CSV 格式</p>
              </div>

              {isProcessing && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">处理中...</span>
                </div>
              )}

              {importResult && (
                <div className={`rounded-lg p-4 ${
                  importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {importResult.success ? (
                      <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {importResult.success ? (
                        <>
                          <div className="font-medium text-green-800 mb-2">导入预览</div>
                          <div className="text-sm text-green-700 space-y-1">
                            <div>总计：{importResult.summary?.total} 个任务</div>
                            <div>有效：{importResult.summary?.valid} 个任务</div>
                            {importResult.summary && importResult.summary.invalid > 0 && (
                              <div className="text-amber-600">跳过：{importResult.summary.invalid} 个无效任务</div>
                            )}
                          </div>
                          <button
                            onClick={handleImportConfirm}
                            className="mt-3 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm"
                          >
                            确认导入
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="font-medium text-red-800 mb-1">导入失败</div>
                          <div className="text-sm text-red-700">{importResult.error}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

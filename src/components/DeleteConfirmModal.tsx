interface DeleteConfirmModalProps {
  isOpen: boolean;
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  taskTitle,
  onConfirm,
  onCancel
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-3">确认删除任务</h3>
        <p className="text-gray-600 mb-2">确定要删除以下任务吗？</p>
        <p className="text-gray-900 font-medium mb-6 p-3 bg-gray-50 rounded border border-gray-200">
          {taskTitle}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 md:px-4 md:py-2 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors active:scale-95"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 md:px-4 md:py-2 px-6 py-3 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors active:scale-95"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

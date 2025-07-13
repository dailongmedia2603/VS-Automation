import React from 'react';
import { TrainingConfig } from './TrainingForm';

const PreviewSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="mb-6 last:mb-0">
    <h3 className="text-base font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-3">{title}</h3>
    <div className="space-y-3 text-sm">{children}</div>
  </div>
);

const PreviewField = ({ label, value }: { label: string, value?: string | null }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
    <dt className="font-medium text-slate-500">{label}</dt>
    <dd className="sm:col-span-2 text-slate-800">{value || <span className="text-slate-400">Chưa cung cấp</span>}</dd>
  </div>
);

const TrainingPreview = ({ config }: { config: TrainingConfig }) => {
  return (
    <div className="max-h-[70vh] overflow-y-auto p-1 pr-4 -mr-2">
      <dl className="space-y-4">
        <PreviewSection title="Thông tin cơ bản">
          <PreviewField label="Lĩnh vực / Ngành nghề" value={config.industry} />
          <PreviewField label="Vai trò của AI" value={config.role} />
          <div>
            <dt className="font-medium text-slate-500 mb-2">Sản phẩm / Dịch vụ</dt>
            <dd className="text-slate-800 pl-4">
              {config.products && config.products.length > 0 ? (
                <ul className="list-disc list-outside space-y-1">
                  {config.products.map(item => <li key={item.id}>{item.value}</li>)}
                </ul>
              ) : <span className="text-slate-400">Chưa cung cấp</span>}
            </dd>
          </div>
        </PreviewSection>

        <PreviewSection title="Phong cách & Tông giọng">
          <PreviewField label="Phong cách trả lời" value={config.style} />
          <PreviewField label="Tông giọng trả lời" value={config.tone} />
          <PreviewField label="Ngôn ngữ" value={config.language} />
          <PreviewField label="Xưng hô" value={config.pronouns} />
          <PreviewField label="Mục tiêu trò chuyện" value={config.goal} />
        </PreviewSection>

        <PreviewSection title="Quy trình & Điều kiện">
          <div>
            <dt className="font-medium text-slate-500 mb-2">Quy trình tư vấn</dt>
            <dd className="text-slate-800 pl-4">
              {config.processSteps && config.processSteps.length > 0 ? (
                <ol className="list-decimal list-outside space-y-1">
                  {config.processSteps.map(item => <li key={item.id}>{item.value}</li>)}
                </ol>
              ) : <span className="text-slate-400">Chưa cung cấp</span>}
            </dd>
          </div>
          <div className="mt-4">
            <dt className="font-medium text-slate-500 mb-2">Điều kiện bắt buộc</dt>
            <dd className="text-slate-800 pl-4">
              {config.conditions && config.conditions.length > 0 ? (
                <ul className="list-disc list-outside space-y-1">
                  {config.conditions.map(item => <li key={item.id}>{item.value}</li>)}
                </ul>
              ) : <span className="text-slate-400">Chưa cung cấp</span>}
            </dd>
          </div>
        </PreviewSection>

        <PreviewSection title="Tài liệu">
          {config.documents && config.documents.length > 0 ? (
            <ul className="space-y-2">
              {config.documents.map(doc => (
                <li key={doc.id} className="p-2 bg-slate-100 rounded-md text-slate-700">{doc.name}</li>
              ))}
            </ul>
          ) : <span className="text-slate-400">Chưa có tài liệu</span>}
        </PreviewSection>
      </dl>
    </div>
  );
};

export default TrainingPreview;
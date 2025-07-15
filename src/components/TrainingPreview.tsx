import React from 'react';
import { TrainingConfig, TrainingItem } from './TrainingForm';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-3">{title}</h3>
    {children}
  </div>
);

const Detail: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-4 text-sm mb-2">
    <dt className="font-medium text-slate-500">{label}</dt>
    <dd className="col-span-2 text-slate-700">{value || <span className="italic text-slate-400">Chưa có</span>}</dd>
  </div>
);

const ListDetail: React.FC<{ label: string; items: TrainingItem[]; prefix?: string }> = ({ label, items, prefix }) => (
  <div>
    <dt className="font-medium text-slate-500 text-sm mb-2">{label}</dt>
    <dd className="col-span-2 text-slate-700 text-sm">
      {items.length > 0 ? (
        <ul className="list-disc pl-5 space-y-1">
          {items.map((item, index) => (
            <li key={item.id}>{prefix && `${prefix} ${index + 1}: `}{item.value}</li>
          ))}
        </ul>
      ) : (
        <span className="italic text-slate-400">Chưa có</span>
      )}
    </dd>
  </div>
);

const TrainingPreview: React.FC<{ config: TrainingConfig }> = ({ config }) => {
  return (
    <div className="max-h-[70vh] overflow-y-auto p-1">
      <Section title="Thông tin cơ bản">
        <Detail label="Lĩnh vực / Ngành nghề" value={config.industry} />
        <Detail label="Vai trò của AI" value={config.role} />
        <div className="mt-4">
          <ListDetail label="Danh sách sản phẩm / dịch vụ" items={config.products} />
        </div>
      </Section>

      <Section title="Phong cách & Tông giọng">
        <Detail label="Phong cách trả lời" value={config.style} />
        <Detail label="Tông giọng trả lời" value={config.tone} />
        <Detail label="Ngôn ngữ trả lời" value={config.language} />
        <Detail label="Page xưng hô là" value={config.pronouns} />
        <Detail label="KH xưng hô là" value={config.customerPronouns} />
        <Detail label="Mục tiêu trò chuyện" value={config.goal} />
      </Section>

      <Section title="Quy trình và Điều kiện">
        <div className="mb-4">
          <ListDetail label="Quy trình tư vấn" items={config.processSteps} prefix="Bước" />
        </div>
        <div>
          <ListDetail label="Điều kiện bắt buộc" items={config.conditions} prefix="Điều kiện" />
        </div>
      </Section>

      <Section title="Tài liệu tham khảo">
        {config.documents.length > 0 ? (
          <ul className="space-y-2">
            {config.documents.map(doc => (
              <li key={doc.id} className="text-sm text-slate-700 p-2 bg-slate-50 rounded-md">
                <strong>{doc.name}</strong> ({doc.type}) - <em>{doc.purpose}</em>
              </li>
            ))}
          </ul>
        ) : (
          <p className="italic text-slate-400 text-sm">Không có tài liệu nào.</p>
        )}
      </Section>
    </div>
  );
};

export default TrainingPreview;
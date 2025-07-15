import React from 'react';
import { TrainingConfig } from './TrainingForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrainingPreviewProps {
  config: TrainingConfig;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</h3>
    <div className="text-slate-800 space-y-1">{children}</div>
  </div>
);

const Value: React.FC<{ label: string; value: string | undefined | null }> = ({ label, value }) => (
  value ? <p><span className="font-semibold">{label}:</span> {value}</p> : null
);

const List: React.FC<{ label: string; items: { value: string }[] }> = ({ label, items }) => (
  items.length > 0 ? (
    <div>
      <p className="font-semibold">{label}:</p>
      <ul className="list-disc pl-6 mt-1">
        {items.map((item, index) => (
          <li key={index}>{item.value}</li>
        ))}
      </ul>
    </div>
  ) : null
);

const PrefixedList: React.FC<{ label: string; items: { value: string }[]; prefix: string }> = ({ label, items, prefix }) => (
  items.length > 0 ? (
    <div>
      <p className="font-semibold">{label}:</p>
      <ol className="list-none pl-0 mt-1 space-y-1">
        {items.map((item, index) => (
          <li key={index}><span className="font-semibold">{prefix} {index + 1}:</span> {item.value}</li>
        ))}
      </ol>
    </div>
  ) : null
);

const TrainingPreview: React.FC<TrainingPreviewProps> = ({ config }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Value label="Lĩnh vực / Ngành nghề" value={config.industry} />
          <Value label="Vai trò của AI" value={config.role} />
          <List label="Sản phẩm / Dịch vụ" items={config.products} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phong cách & Tông giọng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Value label="Phong cách trả lời" value={config.style} />
          <Value label="Tông giọng trả lời" value={config.tone} />
          <Value label="Ngôn ngữ" value={config.language} />
          <Value label="Page xưng hô" value={config.pronouns} />
          <Value label="Khách hàng xưng hô" value={config.customerPronouns} />
          <Value label="Mục tiêu trò chuyện" value={config.goal} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quy trình và Điều kiện</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PrefixedList label="Quy trình tư vấn" items={config.processSteps} prefix="Bước" />
          <PrefixedList label="Điều kiện bắt buộc" items={config.conditions} prefix="Điều kiện" />
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingPreview;
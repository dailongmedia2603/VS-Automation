import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Trash2, Bot, Send, BrainCircuit, Loader2 } from 'lucide-react';

type Example = { id: string; input: string; output: string };

const PromptEngineering = () => {
  const [systemPrompt, setSystemPrompt] = useState('Bạn là một trợ lý AI chuyên nghiệp. Trả về kết quả dưới định dạng JSON hợp lệ.');
  const [rolePrompt, setRolePrompt] = useState('');
  const [context, setContext] = useState('');
  const [instructions, setInstructions] = useState('');
  const [examples, setExamples] = useState<Example[]>([{ id: crypto.randomUUID(), input: '', output: '' }]);
  const [userQuery, setUserQuery] = useState('');

  const [temperature, setTemperature] = useState(0.7);
  const [topK, setTopK] = useState(40);
  const [topP, setTopP] = useState(0.95);
  const [maxTokens, setMaxTokens] = useState(1024);

  const [useCoT, setUseCoT] = useState(false);

  const [aiResponse, setAiResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddExample = () => setExamples([...examples, { id: crypto.randomUUID(), input: '', output: '' }]);
  const handleRemoveExample = (id: string) => setExamples(examples.filter(ex => ex.id !== id));
  const handleExampleChange = (id: string, field: 'input' | 'output', value: string) => {
    setExamples(examples.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  const finalPrompt = useMemo(() => {
    let prompt = '';
    if (systemPrompt) prompt += `[SYSTEM_PROMPT]\n${systemPrompt}\n\n`;
    if (rolePrompt) prompt += `[ROLE_PROMPT]\n${rolePrompt}\n\n`;
    if (context) prompt += `[CONTEXTUAL_INFORMATION]\n${context}\n\n`;
    
    const validExamples = examples.filter(ex => ex.input.trim() && ex.output.trim());
    if (validExamples.length > 0) {
      prompt += `[FEW_SHOT_EXAMPLES]\n`;
      validExamples.forEach(ex => {
        prompt += `EXAMPLE_INPUT: "${ex.input}"\nEXAMPLE_OUTPUT: ${ex.output}\n`;
      });
      prompt += `\n`;
    }

    if (instructions) prompt += `[SPECIFIC_INSTRUCTIONS]\n${instructions}\n\n`;
    if (userQuery) prompt += `[USER_QUERY/TASK]\n${userQuery}\n\n`;
    if (useCoT) prompt += "Let's think step by step.";

    return prompt.trim();
  }, [systemPrompt, rolePrompt, context, instructions, examples, userQuery, useCoT]);

  const handleRunTest = () => {
    setIsGenerating(true);
    setAiResponse('');
    // Simulate API call
    setTimeout(() => {
      setAiResponse(`{\n  "status": "success",\n  "data": {\n    "message": "Đây là một phản hồi mẫu từ AI dựa trên prompt của bạn.",\n    "parameters": {\n      "temperature": ${temperature},\n      "top_k": ${topK},\n      "top_p": ${topP},\n      "max_tokens": ${maxTokens}\n    }\n  }\n}`);
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
      {/* Left Column: Builder */}
      <ScrollArea className="h-[calc(100vh-20rem)] pr-4">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>I. Các Thành Phần Cơ Bản</CardTitle><CardDescription>Nền tảng của mọi prompt, thiết lập bối cảnh và hướng dẫn cơ bản.</CardDescription></CardHeader><CardContent className="space-y-4">
            <div><Label>1. System Prompting</Label><Textarea placeholder="VD: Bạn là một trợ lý AI chuyên tạo nội dung marketing..." value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} /></div>
            <div><Label>2. Role Prompting</Label><Textarea placeholder="VD: Đóng vai một nhà phân tích tài chính thận trọng." value={rolePrompt} onChange={e => setRolePrompt(e.target.value)} /></div>
            <div><Label>3. Contextual Prompting</Label><Textarea placeholder="VD: Người dùng đã thêm các mặt hàng sau vào giỏ hàng: [Sản phẩm A, Sản phẩm B]." value={context} onChange={e => setContext(e.target.value)} /></div>
            <div><Label>4. Specific Instructions</Label><Textarea placeholder="VD: Tạo một bài đăng blog dài 3 đoạn. Chỉ thảo luận về..." value={instructions} onChange={e => setInstructions(e.target.value)} /></div>
            <div><Label>5. Examples (Few-shot)</Label><div className="space-y-2">{examples.map(ex => (<div key={ex.id} className="flex items-start gap-2"><div className="flex-1 space-y-1"><Textarea placeholder="Input Example" value={ex.input} onChange={e => handleExampleChange(ex.id, 'input', e.target.value)} className="text-xs" /><Textarea placeholder="Output Example (JSON, text,...)" value={ex.output} onChange={e => handleExampleChange(ex.id, 'output', e.target.value)} className="text-xs" /></div><Button variant="ghost" size="icon" onClick={() => handleRemoveExample(ex.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>))}<Button variant="outline" size="sm" onClick={handleAddExample}><PlusCircle className="mr-2 h-4 w-4" />Thêm ví dụ</Button></div></div>
            <div><Label>6. User Query/Task</Label><Textarea placeholder="VD: Phân loại đánh giá phim này: 'Bộ phim thật kinh khủng...'" value={userQuery} onChange={e => setUserQuery(e.target.value)} /></div>
          </CardContent></Card>
          
          <Card><CardHeader><CardTitle>II. Tham Số Cấu Hình Đầu Ra</CardTitle><CardDescription>Kiểm soát cách LLM tạo ra phản hồi. Các tham số này được gửi cùng với yêu cầu API.</CardDescription></CardHeader><CardContent className="space-y-6">
            <div><Label className="flex justify-between"><span>Temperature:</span><span>{temperature}</span></Label><Slider value={[temperature]} onValueChange={([val]) => setTemperature(val)} max={1} step={0.05} /><p className="text-xs text-muted-foreground">Thấp: Chính xác, cao: Sáng tạo.</p></div>
            <div><Label className="flex justify-between"><span>Top-K:</span><span>{topK}</span></Label><Slider value={[topK]} onValueChange={([val]) => setTopK(val)} max={100} step={1} /><p className="text-xs text-muted-foreground">Giới hạn số lượng token được xem xét.</p></div>
            <div><Label className="flex justify-between"><span>Top-P:</span><span>{topP}</span></Label><Slider value={[topP]} onValueChange={([val]) => setTopP(val)} max={1} step={0.01} /><p className="text-xs text-muted-foreground">Chọn token dựa trên tổng xác suất.</p></div>
            <div><Label>Max Tokens</Label><Input type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} /><p className="text-xs text-muted-foreground">Giới hạn độ dài tối đa của phản hồi.</p></div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle>III. Kỹ Thuật Nâng Cao</CardTitle><CardDescription>Áp dụng các kỹ thuật để cải thiện khả năng suy luận của mô hình.</CardDescription></CardHeader><CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg"><div className="flex items-center gap-3"><BrainCircuit className="h-5 w-5 text-blue-600" /><div><Label htmlFor="cot-switch">Chain of Thought (CoT)</Label><p className="text-xs text-muted-foreground">Thêm "Let's think step by step." để AI suy luận logic hơn.</p></div></div><Switch id="cot-switch" checked={useCoT} onCheckedChange={setUseCoT} /></div>
          </CardContent></Card>
        </div>
      </ScrollArea>

      {/* Right Column: Preview & Test */}
      <div className="space-y-6">
        <Card className="h-full flex flex-col">
          <CardHeader><CardTitle>Prompt cuối cùng</CardTitle><CardDescription>Đây là chuỗi prompt hoàn chỉnh sẽ được gửi đến API.</CardDescription></CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 bg-slate-50 rounded-md p-4 border">
              <pre className="text-xs whitespace-pre-wrap">{finalPrompt || "Điền thông tin để xem prompt..."}</pre>
            </ScrollArea>
            <Button onClick={handleRunTest} disabled={isGenerating} className="w-full mt-4 bg-green-600 hover:bg-green-700">
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Chạy thử nghiệm
            </Button>
          </CardContent>
        </Card>
        <Card className="h-full flex flex-col">
          <CardHeader><CardTitle>Phản hồi từ AI</CardTitle><CardDescription>Kết quả trả về từ mô hình sau khi chạy thử nghiệm.</CardDescription></CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-full bg-slate-900 text-white rounded-md p-4">
              {isGenerating ? (
                <div className="flex items-center gap-3 text-slate-400">
                  <Bot className="h-5 w-5 animate-pulse" />
                  <span>AI đang suy nghĩ...</span>
                </div>
              ) : (
                <pre className="text-xs whitespace-pre-wrap">{aiResponse || "Chưa có phản hồi."}</pre>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromptEngineering;
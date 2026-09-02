import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import API from '../../services/api.js';
import { parsePPTXFile } from '../../utils/pptParser.js';

const AIGenerator = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [examName, setExamName] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(50);
  const [duration, setDuration] = useState(60);
  const [totalMarks, setTotalMarks] = useState(100);
  const [selectedTypes, setSelectedTypes] = useState(['MCQ', 'CODING', 'DESCRIPTIVE']);

  const [uploadedFilesList, setUploadedFilesList] = useState([]);
  const [totalSlidesParsed, setTotalSlidesParsed] = useState(0);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState(null);

  const toggleType = (type) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length === 1) return; // keep at least one
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const processUploadedFiles = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const filesArray = Array.from(filesList);

    setIsParsingFile(true);
    setToastMessage(`Parsing ${filesArray.length} presentation file(s)...`);

    try {
      let combinedExcerpt = '';
      let slideCountTotal = 0;
      const parsedFileNames = [];

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const ext = file.name.split('.').pop().toLowerCase();
        let fileText = '';
        parsedFileNames.push(file.name);

        if (ext === 'pptx' || ext === 'ppt') {
          fileText = await parsePPTXFile(file);
          const slideMatch = fileText.match(/Total Slides: (\d+)/i);
          if (slideMatch) {
            slideCountTotal += parseInt(slideMatch[1], 10);
          }
        } else {
          fileText = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(String(e.target?.result || ''));
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
          });
        }

        if (fileText.trim()) {
          combinedExcerpt += `=== PRESENTATION ${i + 1}: ${file.name} ===\n${fileText.trim()}\n\n`;
        }
      }

      if (!combinedExcerpt.trim()) {
        throw new Error("No text content could be extracted from the uploaded files.");
      }

      setUploadedFilesList(parsedFileNames);
      setTotalSlidesParsed(slideCountTotal);
      setExcerpt(combinedExcerpt);

      const mainTitle = parsedFileNames.map((f) => f.replace(/\.[^/.]+$/, "")).join(' & ');
      if (!topic) setTopic(mainTitle.slice(0, 100));
      if (!examName) setExamName(`${parsedFileNames[0].replace(/\.[^/.]+$/, "")} Comprehensive Exam`);

      const slideInfo = slideCountTotal > 0 ? ` (${slideCountTotal} slides)` : '';
      setToastMessage(`✨ Successfully loaded ${parsedFileNames.length} presentation(s)${slideInfo}!`);
      setTimeout(() => setToastMessage(''), 4500);

    } catch (err) {
      console.error("Multiple PPT processing error:", err);
      alert(err.message || "Failed to process uploaded presentation files.");
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processUploadedFiles(files);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processUploadedFiles(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const clearUploadedFiles = () => {
    setUploadedFilesList([]);
    setTotalSlidesParsed(0);
    setExcerpt('');
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!topic && !excerpt) {
      alert('please enter a syllabus topic or upload PowerPoint presentations / documents.');
      return;
    }

    setIsGenerating(true);
    setToastMessage('');
    try {
      const response = await API.post('/exam/generate-ai', {
        topic: topic || examName || 'Presentation Assessment',
        excerpt,
        examName: examName || `${topic || 'PPT'} Assessment`,
        difficulty,
        count: questionCount,
        duration,
        totalMarks,
        questionTypes: selectedTypes
      });

      if (response.data && response.data.questions) {
        setGeneratedQuestions(response.data.questions);
        if (!examName) setExamName(response.data.exam_name);
        setToastMessage(`✨ AI Exam Generated from ${uploadedFilesList.length > 0 ? `${uploadedFilesList.length} Presentations` : 'Topic'}!`);
        setTimeout(() => setToastMessage(''), 4000);
      }
    } catch (err) {
      console.error("AI Generation Failed:", err);
      alert(err.response?.data?.message || err.message || "Failed to generate AI exam.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuestionChange = (index, field, value) => {
    if (!generatedQuestions) return;
    const updated = [...generatedQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedQuestions(updated);
  };

  const handleRemoveQuestion = (index) => {
    if (!generatedQuestions) return;
    setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== index));
  };

  const handleAddQuestion = () => {
    const newQ = {
      type: 'MCQ',
      question_text: 'New Question Statement',
      option_a: 'Option A',
      option_b: 'Option B',
      option_c: 'Option C',
      option_d: 'Option D',
      correct_option: 'A',
      rubric: 'Explanation for correct choice'
    };
    setGeneratedQuestions([...(generatedQuestions || []), newQ]);
  };

  const handlePublish = async () => {
    if (!generatedQuestions || generatedQuestions.length === 0) {
      alert("No questions to publish.");
      return;
    }

    setIsPublishing(true);
    try {
      const res = await API.post('/exam/save-generated', {
        exam_name: examName || 'AI Generated Exam',
        subject: topic || 'General Science',
        duration_minutes: duration,
        total_marks: totalMarks,
        questions: generatedQuestions
      });

      if (res.data && res.data.success) {
        setToastMessage(`🚀 Exam Published! (${res.data.question_count} questions saved)`);
        setTimeout(() => {
          setToastMessage('');
          if (window.confirm("Exam published successfully! Would you like to view your Published Exams Library on the Admin Dashboard?")) {
            navigate('/admin-dashboard');
          }
        }, 1200);
      }
    } catch (err) {
      console.error("Publishing Failed:", err);
      alert(err.response?.data?.message || err.message || "Failed to publish exam to system.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-md">
        <div>
          <div className="flex items-center gap-xs mb-xs">
            <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span className="font-label-md text-label-md text-primary tracking-widest uppercase font-bold">Multi-PPT & Presentation AI Generator</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-white">AI Exam Generator</h2>
          <p className="text-slate-300 font-body-md text-body-md">Upload multiple PowerPoint presentations (.pptx), textbook excerpts or prompts to construct comprehensive exams.</p>
        </div>
      </header>

      {/* Main Generator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">

        {/* Input Configuration Panel (Left side) */}
        <div className="lg:col-span-5 flex flex-col gap-lg">
          <form onSubmit={handleGenerate} className="glass-card p-lg rounded-2xl flex flex-col gap-md">
            <h3 className="font-title-lg text-title-lg text-white flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">co_present</span>
              PowerPoint Presentations & Topic
            </h3>

            {/* Multi-PPT / File Dropzone */}
            <div>
              <label className="block text-slate-300 font-label-md text-label-md mb-xs font-bold">
                Upload Presentations (Select 3+ .pptx / .ppt files)
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`relative border-2 border-dashed rounded-2xl p-lg text-center transition-all cursor-pointer ${
                  uploadedFilesList.length > 0
                    ? 'border-green-500/80 bg-green-500/5'
                    : 'border-slate-700 hover:border-primary bg-slate-900/60'
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept=".pptx,.ppt,.txt,.md,.json,.csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />

                <div className="flex flex-col items-center gap-xs">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    uploadedFilesList.length > 0 ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'
                  }`}>
                    <span className="material-symbols-outlined !text-[28px]">
                      {isParsingFile ? 'sync' : (uploadedFilesList.length > 0 ? 'task_alt' : 'slideshow')}
                    </span>
                  </div>

                  {isParsingFile ? (
                    <p className="font-label-md text-sm text-primary animate-pulse">Parsing PowerPoint Presentations...</p>
                  ) : uploadedFilesList.length > 0 ? (
                    <div>
                      <span className="font-bold text-sm text-green-400 block">
                        {uploadedFilesList.length} Presentation(s) Loaded
                      </span>
                      <span className="text-xs text-slate-400 block mt-[2px]">
                        {totalSlidesParsed > 0 ? `${totalSlidesParsed} total slides parsed` : `${Math.round(excerpt.length / 1024)} KB content extracted`}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="font-title-sm text-sm text-white font-semibold">
                        Click or Drag & Drop Multiple PPTX / PPT Files
                      </p>
                      <p className="text-xs text-slate-400 mt-[2px]">
                        Select 3+ PowerPoint files (.pptx, .ppt) or notes at once
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Files Chips */}
              {uploadedFilesList.length > 0 && (
                <div className="mt-xs flex flex-wrap gap-xs items-center">
                  {uploadedFilesList.map((fileName, fIdx) => (
                    <span key={fIdx} className="px-xs py-[2px] rounded-lg bg-green-950/80 border border-green-800 text-green-300 text-[11px] font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">slideshow</span>
                      <span className="truncate max-w-[140px]">{fileName}</span>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={clearUploadedFiles}
                    className="text-[11px] text-red-400 hover:underline ml-xs font-semibold"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Exam Name */}
            <div>
              <label className="block text-slate-300 font-label-md text-xs mb-xs">Exam Title</label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. Operating Systems & Architecture Comprehensive"
                className="w-full bg-slate-900/60 border border-outline-variant/30 rounded-xl px-md py-sm font-body-md text-white outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Syllabus Topic / Subject Prompt */}
            <div>
              <label className="block text-slate-300 font-label-md text-xs mb-xs">Syllabus Topic / Subject Prompt</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Memory Management, CPU Scheduling & File Systems"
                className="w-full bg-slate-900/60 border border-outline-variant/30 rounded-xl px-md py-sm font-body-md text-white outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Extracted Slide Text Preview */}
            <div>
              <div className="flex justify-between items-center mb-xs">
                <label className="text-slate-300 font-label-md text-xs">Aggregated Presentation Text</label>
                {excerpt && (
                  <button
                    type="button"
                    onClick={clearUploadedFiles}
                    className="text-[11px] text-red-400 hover:underline"
                  >
                    Clear Text
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Contents extracted from all 3+ PPT files will aggregate here automatically..."
                className="w-full bg-slate-950/80 border border-outline-variant/30 rounded-xl p-md font-mono-sm text-xs text-slate-300 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Question Types Selection */}
            <div>
              <label className="block text-slate-300 font-label-md text-xs mb-xs font-semibold">Question Types to Include</label>
              <div className="flex flex-wrap gap-xs">
                {[
                  { id: 'MCQ', label: 'MCQs', icon: 'quiz' },
                  { id: 'CODING', label: 'Coding Challenges', icon: 'code' },
                  { id: 'DESCRIPTIVE', label: 'Descriptive & Rubrics', icon: 'article' },
                ].map((qt) => {
                  const isSel = selectedTypes.includes(qt.id);
                  return (
                    <button
                      type="button"
                      key={qt.id}
                      onClick={() => toggleType(qt.id)}
                      className={`px-md py-xs rounded-xl font-label-md text-xs flex items-center gap-xs transition-all cursor-pointer ${
                        isSel
                          ? 'bg-primary text-white shadow-sm font-bold'
                          : 'bg-slate-800/60 text-slate-400 border border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{qt.icon}</span>
                      {qt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Parameters Grid */}
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className="block text-slate-300 font-label-md text-xs mb-xs">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-slate-900/60 border border-outline-variant/30 rounded-xl px-md py-sm font-body-md text-white outline-none"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Adaptive">Adaptive Mixed</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-label-md text-xs mb-xs">Question Count (Up to 50)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.min(Math.max(Number(e.target.value), 1), 50))}
                  className="w-full bg-slate-900/60 border border-outline-variant/30 rounded-xl px-md py-sm font-body-md text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-label-md text-xs mb-xs">Duration (Max 60 Mins)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={duration}
                  onChange={(e) => setDuration(Math.min(Math.max(Number(e.target.value), 1), 60))}
                  className="w-full bg-slate-900/60 border border-outline-variant/30 rounded-xl px-md py-sm font-body-md text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-label-md text-xs mb-xs">Total Marks (100 Marks)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Math.min(Math.max(Number(e.target.value), 1), 100))}
                  className="w-full bg-slate-900/60 border border-outline-variant/30 rounded-xl px-md py-sm font-body-md text-white outline-none"
                />
              </div>
            </div>

            {/* Generate Trigger */}
            <button
              type="submit"
              disabled={isGenerating || isParsingFile}
              className="mt-sm w-full py-md bg-gradient-to-r from-primary to-purple-600 text-white font-title-lg rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-sm cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              {isGenerating ? 'Synthesizing Questions with AI…' : 'Generate AI Exam Questions'}
            </button>
          </form>
        </div>

        {/* Generated Questions Preview & Interactive Editor (Right side) */}
        <div className="lg:col-span-7 flex flex-col gap-lg">
          <div className="glass-card p-lg rounded-2xl flex flex-col min-h-[520px]">
            
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-md pb-md border-b border-slate-700/60">
              <div>
                <h3 className="font-title-lg text-title-lg text-white flex items-center gap-sm">
                  <span className="material-symbols-outlined text-secondary">preview</span>
                  Generated Exam Draft
                </h3>
                <p className="text-xs text-slate-400">Review, modify options, test cases or rubrics before publishing to database.</p>
              </div>

              {generatedQuestions && generatedQuestions.length > 0 && (
                <div className="flex gap-xs">
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-md py-xs bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    Add Question
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="px-lg py-xs bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[16px]">publish</span>
                    {isPublishing ? 'Publishing…' : 'Publish Exam'}
                  </button>
                </div>
              )}
            </div>

            {/* Empty State when no questions generated yet */}
            {!generatedQuestions && !isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-xl opacity-60">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-md">
                  <span className="material-symbols-outlined !text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>co_present</span>
                </div>
                <h4 className="font-title-md text-title-md text-white">Upload 3+ PPTs or Enter Topic to Generate</h4>
                <p className="text-sm text-slate-400 max-w-sm mt-xs">
                  Upload multiple PowerPoint presentations (.pptx) or enter a syllabus topic on the left and click <b>Generate AI Exam Questions</b>.
                </p>
              </div>
            )}

            {/* Loading State */}
            {isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-xl">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-md"></div>
                <h4 className="font-title-md text-title-md text-white animate-pulse">LLM Synthesizing Questions & Rubrics…</h4>
                <p className="text-xs text-slate-400 mt-xs">Analyzing slide contents across all presentation files.</p>
              </div>
            )}

            {/* Questions List Editor */}
            {generatedQuestions && generatedQuestions.length > 0 && !isGenerating && (
              <div className="mt-md flex flex-col gap-lg max-h-[600px] overflow-y-auto pr-xs">
                {generatedQuestions.map((q, idx) => (
                  <div key={idx} className="p-md rounded-xl bg-slate-900/60 border border-slate-700/80 flex flex-col gap-sm relative group">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-xs">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="px-xs py-[2px] rounded-full bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                          {q.type || 'MCQ'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-slate-500 hover:text-red-400 p-xs transition-colors cursor-pointer"
                        title="Delete Question"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>

                    {/* Question Statement Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-xs">Question Statement</label>
                      <textarea
                        rows={2}
                        value={q.question_text || ''}
                        onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-sm font-body-md text-white text-sm outline-none focus:border-primary"
                      />
                    </div>

                    {/* Type: MCQ options */}
                    {(!q.type || q.type === 'MCQ') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-xs mt-xs">
                        {['option_a', 'option_b', 'option_c', 'option_d'].map((optKey, oIdx) => {
                          const optLabel = String.fromCharCode(65 + oIdx);
                          const isCorrect = q.correct_option === optLabel;
                          return (
                            <div key={optKey} className="flex items-center gap-xs bg-slate-800/40 p-xs rounded-lg border border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleQuestionChange(idx, 'correct_option', optLabel)}
                                className={`w-6 h-6 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                                  isCorrect ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                }`}
                                title="Mark as correct answer"
                              >
                                {optLabel}
                              </button>
                              <input
                                type="text"
                                value={q[optKey] || ''}
                                onChange={(e) => handleQuestionChange(idx, optKey, e.target.value)}
                                className="w-full bg-transparent text-xs text-slate-200 outline-none"
                                placeholder={`Option ${optLabel}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Type: Coding Challenge Starter Code */}
                    {q.type === 'CODING' && (
                      <div className="mt-xs">
                        <label className="block text-[11px] font-bold text-slate-400 mb-xs">Starter Code Template</label>
                        <textarea
                          rows={4}
                          value={q.starter_code || ''}
                          onChange={(e) => handleQuestionChange(idx, 'starter_code', e.target.value)}
                          className="w-full bg-slate-950 font-mono-sm text-xs text-green-400 p-sm rounded-lg border border-slate-800 outline-none"
                        />
                      </div>
                    )}

                    {/* Evaluation Rubric / Explanation */}
                    <div className="mt-xs">
                      <label className="block text-[11px] font-bold text-slate-400 mb-xs">
                        {q.type === 'DESCRIPTIVE' ? 'Grading Rubric & Criteria' : 'Answer Explanation / Test Cases'}
                      </label>
                      <input
                        type="text"
                        value={q.rubric || ''}
                        onChange={(e) => handleQuestionChange(idx, 'rubric', e.target.value)}
                        placeholder="Evaluation rubric or explanation..."
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-sm py-xs text-xs text-slate-300 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-lg left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-lg py-sm rounded-xl shadow-2xl font-label-md text-label-md border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          {toastMessage}
        </div>
      )}
    </AdminLayout>
  );
};

export default AIGenerator;

"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Upload,
  Video,
  Mic,
  FileText,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { sampleModules } from "@/lib/mock-data";
import Link from "next/link";

type ContentType = "video" | "audio" | "text";

export default function NewLessonPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [contentType, setContentType] = React.useState<ContentType>("video");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [textContent, setTextContent] = React.useState("");
  const [selectedModule, setSelectedModule] = React.useState(sampleModules[0]?.id || "");
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [transcribing, setTranscribing] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [vttUrl, setVttUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const simulateUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);

    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 150));
      setUploadProgress(i);
    }

    setUploading(false);
  };

  const handleTranscribe = async () => {
    setTranscribing(true);

    await new Promise((r) => setTimeout(r, 2500));

    const sampleTranscript = `[00:00:00] Welcome to this lesson on the UPSC Exam Pattern and Syllabus Overview.

[00:00:15] The Union Public Service Commission conducts the Civil Services Examination in three stages.

[00:00:30] First is the Preliminary Examination, which consists of two papers: General Studies and CSAT.

[00:00:45] The Prelims is qualifying in nature. Your score does not count towards the final ranking.

[00:01:00] The second stage is the Mains Examination, which has nine papers including four General Studies papers.

[00:01:20] Additionally, there are two optional subject papers, one essay paper, and two qualifying language papers.

[00:01:40] The final stage is the Personality Test or Interview, which carries 275 marks.

[00:02:00] The total marks for ranking are 2025: 1750 from Mains plus 275 from the Interview.

[00:02:20] Let me now explain the detailed syllabus for each stage and how to approach your preparation.

[00:02:40] For Prelims, focus on current affairs, NCERT books, and standard reference materials.

[00:03:00] For Mains, answer writing practice is key. Start writing answers from day one.

[00:03:20] Remember, consistency and structured preparation are the keys to cracking this examination.

[00:03:40] Thank you for watching. Practice well and stay focused on your goal.`;

    setTranscript(sampleTranscript);
    setVttUrl("/sample-captions.vtt");
    setTranscribing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    alert("Lesson saved successfully! (Demo - connect Supabase to persist data)");
    router.push(`/admin/courses/${courseId}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/courses/${courseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add New Lesson</h1>
          <p className="text-muted-foreground">Create a video, audio, or text lesson</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Lesson Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Introduction to UPSC Exam Pattern"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this lesson..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Module</Label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {sampleModules.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.title}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Content Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { type: "video" as ContentType, icon: Video, label: "Video (MP4)" },
                { type: "audio" as ContentType, icon: Mic, label: "Audio (MP3)" },
                { type: "text" as ContentType, icon: FileText, label: "Text/Article" },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setContentType(item.type)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    contentType === item.type
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            {contentType === "video" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="video/mp4,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">
                      {file ? file.name : "Click to upload MP4 video"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Max 2GB. HLS streaming will be generated.</p>
                  </label>
                </div>

                {file && (
                  <div className="space-y-2">
                    <Button type="button" onClick={simulateUpload} disabled={uploading} variant="outline" className="w-full">
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading... {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Video
                        </>
                      )}
                    </Button>
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    )}
                    {uploadProgress === 100 && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" /> Upload complete
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleTranscribe}
                  disabled={!file || transcribing}
                  className="w-full"
                >
                  {transcribing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Transcribing with AI...
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Auto-Generate Captions & Transcript
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {contentType === "audio" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="audio/mp3,audio/mpeg,audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">
                      {file ? file.name : "Click to upload MP3 audio"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Max 500MB. HLS audio streaming will be generated.</p>
                  </label>
                </div>

                {file && (
                  <>
                    <Button type="button" onClick={simulateUpload} disabled={uploading} variant="outline" className="w-full">
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading... {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Audio
                        </>
                      )}
                    </Button>
                    <Button type="button" onClick={handleTranscribe} disabled={transcribing} className="w-full">
                      {transcribing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Transcribing...
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-4 w-4" />
                          Generate Transcript
                        </>
                      )}
                    </Button>
                  </>
                )}
              </motion.div>
            )}

            {contentType === "text" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <Label htmlFor="textContent">Article / Lesson Content</Label>
                <Textarea
                  id="textContent"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Write your lesson content here. You can include syllabus notes, reading material, or any text content..."
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-PlainText">Plain text formatting supported. Line breaks are preserved.</p>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {transcript && (
          <Card className="mb-6 border-green-200 dark:border-green-900">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Auto-Generated Transcript
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="success">Transcription Complete</Badge>
                {vttUrl && <Badge variant="outline">VTT Captions Generated</Badge>}
              </div>
              <div className="bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
                  {transcript}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">
                This transcript has been auto-saved to the lesson record. Students can view captions and search through the transcript.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Link href={`/admin/courses/${courseId}`}>
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Lesson"}
          </Button>
        </div>
      </form>
    </div>
  );
}

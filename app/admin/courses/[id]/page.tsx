"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Play,
  Headphones,
  FileText,
  GripVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { sampleModules, sampleLessons, courses } from "@/lib/mock-data";
import { formatDuration } from "@/lib/utils";
import Link from "next/link";

function getContentTypeIcon(contentType: string) {
  switch (contentType) {
    case "video": return Play;
    case "audio": return Headphones;
    case "text": return FileText;
    default: return Play;
  }
}

export default function AdminCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const course = courses.find((c) => c.id === courseId) || courses[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground">{course.category} • {course.level}</p>
        </div>
        <Link href={`/admin/courses/${courseId}/lessons/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Lesson
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {sampleModules.map((module, mi) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mi * 0.05 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    Module {mi + 1}: {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {sampleLessons
                      .filter((l) => l.module_id === module.id)
                      .map((lesson, li) => {
                        const LIcon = getContentTypeIcon(lesson.content_type || "video");
                        return (
                          <div
                            key={lesson.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <LIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{lesson.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs">
                                  {(lesson.content_type || "video").toUpperCase()}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDuration(lesson.duration_seconds)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">Add a new module</p>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Module
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Total Modules</span>
                  <span className="font-medium">{sampleModules.length}</span>
                </div>
                <Progress value={100} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Total Lessons</span>
                  <span className="font-medium">{sampleLessons.length}</span>
                </div>
                <Progress value={100} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Video Lessons</span>
                  <span className="font-medium">{sampleLessons.filter((l) => l.content_type === "video").length}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Audio Lessons</span>
                  <span className="font-medium">{sampleLessons.filter((l) => l.content_type === "audio").length}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Text Lessons</span>
                  <span className="font-medium">{sampleLessons.filter((l) => l.content_type === "text").length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/admin/courses/${courseId}/lessons/new`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Lesson
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Course Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

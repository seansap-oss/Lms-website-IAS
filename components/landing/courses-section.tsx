"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Clock, Users, Star, Filter } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { courses } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

const categories = ["all", "foundation", "prelims", "mains", "optional", "test-series"];

export function CoursesSection() {
  const [activeFilter, setActiveFilter] = React.useState("all");

  const filteredCourses = activeFilter === "all"
    ? courses
    : courses.filter((c) => c.category === activeFilter);

  return (
    <section id="courses" className="relative py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 mb-4">
            <Filter className="h-4 w-4" />
            Course Catalog
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Explore Our <span className="gradient-text">Premium Courses</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Structured programs designed by experts to help you crack UPSC, MPSC, and State PSC exams
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeFilter === cat
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted-foreground/10"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="glass-card-hover overflow-hidden h-full flex flex-col">
                <div className="relative aspect-video bg-gradient-to-br from-blue-500 to-purple-600">
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="h-full w-full object-cover opacity-80"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-white/90 text-gray-900 hover:bg-white/90">
                      {course.category.replace("-", " ")}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="bg-black/50 text-white border-0">
                      {course.level}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <h3 className="font-semibold text-lg leading-tight line-clamp-2">{course.title}</h3>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-xl font-bold text-primary">{formatCurrency(course.price)}</span>
                    <Link href={`/learn/${course.slug}`}>
                      <Button size="sm">View Details</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap, MapPin, Phone, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-white">Ibemhal</span>
                <span className="block text-xs text-blue-400 -mt-0.5">IAS ACADEMY</span>
              </div>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Manipur&apos;s premier civil services coaching institute, dedicated to nurturing the next generation of administrators.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#courses" className="hover:text-blue-400 transition-colors">Courses</Link></li>
              <li><Link href="#toppers" className="hover:text-blue-400 transition-colors">Toppers</Link></li>
              <li><Link href="#pricing" className="hover:text-blue-400 transition-colors">Pricing</Link></li>
              <li><Link href="#campus" className="hover:text-blue-400 transition-colors">Campus</Link></li>
              <li><Link href="/ai-tutor" className="hover:text-blue-400 transition-colors">AI Tutor</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Programs</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#courses" className="hover:text-blue-400 transition-colors">Foundation Batch</Link></li>
              <li><Link href="#courses" className="hover:text-blue-400 transition-colors">Mains Special</Link></li>
              <li><Link href="#courses" className="hover:text-blue-400 transition-colors">Prelims Test Series</Link></li>
              <li><Link href="#courses" className="hover:text-blue-400 transition-colors">Optional Subjects</Link></li>
              <li><Link href="#courses" className="hover:text-blue-400 transition-colors">Current Affairs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" />
                <span>Keishampat, Imphal West, Manipur 795001</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-400 shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                <span>info@ibemhalias.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Ibemhal IAS Academy. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-blue-400 transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-blue-400 transition-colors">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

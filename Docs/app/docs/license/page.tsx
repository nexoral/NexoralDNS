import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/MotionWrapper";

export const metadata: Metadata = {
  title: "License - NexoralDNS Documentation",
  description: "NexoralDNS license information and terms of use.",
};

export default function LicensePage() {
  return (
    <div className="px-4 sm:px-6 lg:px-12 py-12">
      <FadeIn>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              License
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Understanding the terms under which you can use NexoralDNS
            </p>
          </div>

          {/* License Overview */}
          <div className="mb-12 p-6 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">MIT License</h2>
                <p className="text-gray-400 text-sm">Open Source Software</p>
              </div>
            </div>
            <p className="text-gray-300">
              NexoralDNS is released under the MIT License, one of the most permissive open source licenses available.
              This means you can use, modify, and distribute NexoralDNS freely, even in commercial projects.
            </p>
          </div>

          {/* What You Can Do */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400">✓</span>
              What You Can Do
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Commercial Use", desc: "Use NexoralDNS in commercial products and services" },
                { title: "Modify", desc: "Modify the source code to fit your needs" },
                { title: "Distribute", desc: "Distribute copies of NexoralDNS" },
                { title: "Private Use", desc: "Use NexoralDNS for personal/private purposes" },
                { title: "Sublicense", desc: "Grant others the same rights you have" },
              ].map((item) => (
                <div key={item.title} className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <h3 className="font-semibold text-green-400 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Requirements */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center text-yellow-400">📋</span>
              Requirements
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                <h3 className="font-semibold text-yellow-400 mb-1">Include License</h3>
                <p className="text-sm text-gray-400">
                  You must include a copy of the license and copyright notice in any substantial portions of the software you distribute.
                </p>
              </div>
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                <h3 className="font-semibold text-yellow-400 mb-1">Include Copyright</h3>
                <p className="text-sm text-gray-400">
                  Keep the original copyright notice in your copies or modifications.
                </p>
              </div>
            </div>
          </section>

          {/* Limitations */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400">⚠️</span>
              Limitations
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                <h3 className="font-semibold text-red-400 mb-1">No Liability</h3>
                <p className="text-sm text-gray-400">
                  The software is provided &quot;as is&quot;, without warranty of any kind. Authors are not liable for any damages.
                </p>
              </div>
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                <h3 className="font-semibold text-red-400 mb-1">No Warranty</h3>
                <p className="text-sm text-gray-400">
                  There is no warranty, either express or implied, including but not limited to merchantability or fitness for a particular purpose.
                </p>
              </div>
            </div>
          </section>

          {/* Full License Text */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Full License Text</h2>
            <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
              <pre className="text-sm text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
                {`MIT License

Copyright (c) 2024 Nexoral

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
              </pre>
            </div>
          </section>

          {/* Questions */}
          <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl text-center">
            <h3 className="text-xl font-bold mb-2">Have Questions About Licensing?</h3>
            <p className="text-gray-400 mb-4">
              If you have questions about how you can use NexoralDNS, feel free to reach out.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

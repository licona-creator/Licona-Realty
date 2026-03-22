/**
 * Dashboard — Premium Morning Briefing
 *
 * First screen the agent sees. Full Licona Realty brand.
 * Approval queue module first and most prominent.
 * System health score and smart suggestions on every load.
 */

'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { BRAND } from '@/lib/brand';
import {
  CheckCircle,
  Users,
  FileText,
  TrendingUp,
  Calendar,
  Star,
  Shield,
  Zap,
} from 'lucide-react';

// Staggered animation for dashboard cards
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl lg:text-3xl font-semibold text-text dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Good morning, Anthony
          </h1>
          <p className="text-sm text-text/50 dark:text-white/50 font-inter mt-1">
            {BRAND.tagline}
          </p>
        </div>
        <LRMonogram size="md" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6"
      >
        {/* Approval Queue — First and Most Prominent */}
        <motion.div variants={item} className="md:col-span-2 xl:col-span-3">
          <Card variant="approval" className="!p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={22} className="text-gold" />
                <h2 className="text-lg font-semibold font-montserrat text-text dark:text-white">
                  Approval Queue
                </h2>
                <Badge count={0} variant="gold" />
              </div>
              <a
                href="/approval-queue"
                className="text-sm text-gold font-montserrat font-medium hover:underline"
              >
                View All
              </a>
            </div>
            <p className="text-sm text-text/50 dark:text-white/50 font-inter">
              No items waiting for your review. You are all caught up.
            </p>
          </Card>
        </motion.div>

        {/* Pipeline Value */}
        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-gold" />
              <h3 className="text-sm font-montserrat font-semibold text-text/70 dark:text-white/70">
                Pipeline Value
              </h3>
            </div>
            <p
              className="text-3xl font-bold"
              style={{ fontFamily: BRAND.fonts.dmSerif, color: BRAND.colors.text }}
            >
              $0
            </p>
            <p className="text-xs text-text/40 dark:text-white/40 font-inter mt-1">
              Estimated commission across all tracks
            </p>
          </Card>
        </motion.div>

        {/* Active Contacts */}
        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Users size={18} className="text-gold" />
              <h3 className="text-sm font-montserrat font-semibold text-text/70 dark:text-white/70">
                Active Contacts
              </h3>
            </div>
            <p
              className="text-3xl font-bold"
              style={{ fontFamily: BRAND.fonts.dmSerif, color: BRAND.colors.text }}
            >
              0
            </p>
            <p className="text-xs text-text/40 dark:text-white/40 font-inter mt-1">
              Across 5 lead tracks + sphere
            </p>
          </Card>
        </motion.div>

        {/* Active Transactions */}
        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} className="text-gold" />
              <h3 className="text-sm font-montserrat font-semibold text-text/70 dark:text-white/70">
                Active Transactions
              </h3>
            </div>
            <p
              className="text-3xl font-bold"
              style={{ fontFamily: BRAND.fonts.dmSerif, color: BRAND.colors.text }}
            >
              0
            </p>
            <p className="text-xs text-text/40 dark:text-white/40 font-inter mt-1">
              Closings this month
            </p>
          </Card>
        </motion.div>

        {/* Upcoming Schedule */}
        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-gold" />
              <h3 className="text-sm font-montserrat font-semibold text-text/70 dark:text-white/70">
                Today&apos;s Schedule
              </h3>
            </div>
            <p className="text-sm text-text/50 dark:text-white/50 font-inter">
              No meetings scheduled today.
            </p>
          </Card>
        </motion.div>

        {/* Testimonials */}
        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Star size={18} className="text-gold" />
              <h3 className="text-sm font-montserrat font-semibold text-text/70 dark:text-white/70">
                Reviews
              </h3>
            </div>
            <p className="text-sm text-text/50 dark:text-white/50 font-inter">
              No reviews yet. Post-closing requests will appear here.
            </p>
          </Card>
        </motion.div>

        {/* Security Health */}
        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={18} className="text-green-500" />
              <h3 className="text-sm font-montserrat font-semibold text-text/70 dark:text-white/70">
                Security Status
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <p className="text-sm text-text/70 dark:text-white/70 font-inter">
                All systems secure
              </p>
            </div>
            <p className="text-xs text-text/40 dark:text-white/40 font-inter mt-2">
              MFA active &middot; No anomalies detected
            </p>
          </Card>
        </motion.div>

        {/* Smart Suggestions */}
        <motion.div variants={item} className="md:col-span-2 xl:col-span-3">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-gold" />
              <h3 className="text-sm font-montserrat font-semibold text-text/70 dark:text-white/70">
                Smart Suggestions
              </h3>
            </div>
            <p className="text-sm text-text/50 dark:text-white/50 font-inter">
              Add your first contacts to start receiving personalized
              recommendations from the intelligence layer.
            </p>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

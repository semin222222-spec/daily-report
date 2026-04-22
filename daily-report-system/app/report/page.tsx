'use client';

import RequireRole from '@/components/RequireRole';
import ReportForm from '@/components/ReportForm';

export default function ReportPage() {
  return (
    <RequireRole allow={['manager']}>
      <ReportForm />
    </RequireRole>
  );
}

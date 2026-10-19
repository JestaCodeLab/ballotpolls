import DatePicker from './DatePicker'
import TimePicker from './TimePicker'
import { todayISO } from '../lib/datetime'

interface Props {
  label: string
  // Local date and time as 'YYYY-MM-DDTHH:mm', or '' when nothing is chosen yet.
  value: string
  onChange: (value: string) => void
  // Earliest selectable day, 'YYYY-MM-DD'.
  minDate?: string
  disabled?: boolean
}

const DEFAULT_TIME = '09:00'

// A date picker and a time picker side by side, joined into one value.
export default function DateTimeField({ label, value, onChange, minDate, disabled }: Props) {
  const [date = '', time = ''] = value ? value.split('T') : []
  return (
    <div role="group" aria-label={label} className="text-sm">
      <div className="mb-1.5 font-medium">{label}</div>
      <div className="flex gap-2">
        <div className="min-w-0 flex-[3]">
          {/* Choosing a day first fills in 9:00 AM so the value is complete straight away. */}
          <DatePicker ariaLabel={`${label} date`} value={date} min={minDate} disabled={disabled} onChange={(d) => onChange(`${d}T${time || DEFAULT_TIME}`)} />
        </div>
        <div className="min-w-0 flex-[2]">
          {/* Choosing a time first uses the earliest allowed day (today, or the opening day for a closing time). */}
          <TimePicker ariaLabel={`${label} time`} value={time} disabled={disabled} onChange={(t) => onChange(`${date || minDate || todayISO()}T${t}`)} />
        </div>
      </div>
    </div>
  )
}

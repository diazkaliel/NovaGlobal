import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import BigDeliveryCalendar from '../components/BigDeliveryCalendar'

export default function FullCalendarPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 relative flex flex-col">
      {/* Header Nova */}
      <nav className="relative z-10 border-b border-slate-800/80 pb-5">
        <div className="max-w-[96%] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-9 h-9 rounded-xl border border-slate-800 bg-[#0c111d] text-slate-400 hover:text-white hover:border-slate-700 flex items-center justify-center cursor-pointer transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="text-left">
              <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">
                Panel de Proyección y Entregas
              </h1>
              <p className="text-slate-400 text-xs mt-1">Nova Technologies</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-[96%] mx-auto py-2 w-full flex-1 flex flex-col">
        <div className="nova-card overflow-hidden flex-1 flex flex-col">
          <BigDeliveryCalendar system="nova" />
        </div>
      </main>
    </div>
  )
}


import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import BigDeliveryCalendar from '../components/BigDeliveryCalendar'

export default function FullCalendarPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden flex flex-col">
      <AnimatedBackground />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-gray-900/40 backdrop-blur-xl bg-gray-950/40 px-6 py-4">
        <div className="max-w-[96%] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-cyan-400 transition-colors p-1.5 hover:bg-gray-800/40 rounded-lg cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Calendar size={16} />
              </div>
              <div className="text-left">
                <h1 className="text-sm font-bold tracking-widest text-gray-300 uppercase leading-none">
                  Panel de Proyección y Entregas
                </h1>
                <p className="text-gray-650 text-[9px] uppercase tracking-wider mt-0.5">Nova Tecnologies</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-[96%] mx-auto px-4 py-6 w-full flex-1 flex flex-col">
        <div className="bg-gray-900/5 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.4)] border border-gray-900/30 backdrop-blur-md flex-1 flex flex-col">
          <BigDeliveryCalendar system="nova" />
        </div>
      </main>
    </div>
  )
}


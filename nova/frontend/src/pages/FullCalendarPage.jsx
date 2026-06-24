import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import DeliveryCalendar from '../components/DeliveryCalendar'

export default function FullCalendarPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden flex flex-col">
      <AnimatedBackground />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-gray-800/50 backdrop-blur-xl bg-gray-950/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-cyan-400 transition-colors p-1.5 hover:bg-gray-800 rounded-lg cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Calendar size={16} />
              </div>
              <div className="text-left">
                <h1 className="text-sm font-bold tracking-widest text-gray-300 uppercase leading-none">
                  Calendario Completo
                </h1>
                <p className="text-gray-650 text-[9px] uppercase tracking-wider mt-0.5">Nova Tecnologies</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8 w-full flex-1">
        <div className="bg-gray-900/20 rounded-2xl p-1.5 overflow-hidden shadow-lg border border-gray-800/50 backdrop-blur-md">
          <DeliveryCalendar system="nova" interactive={true} />
        </div>
      </main>
    </div>
  )
}

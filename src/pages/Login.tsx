import { useAuth0 } from '@auth0/auth0-react'
import DarkModeToggle from '../components/DarkModeToggle'

export default function LoginPage() {
  const { loginWithRedirect } = useAuth0()

  return (
    <div className="min-h-screen bg-gray-900 dark:bg-gray-900 flex items-center justify-center p-8">
      {/* Toggle Dark Mode in alto a destra */}
      <div className="fixed top-4 right-4 z-50">
        <DarkModeToggle />
      </div>
      {/* Pattern di sfondo con punti */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="relative z-10 max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
        {/* Sezione sinistra - Testo */}
        <div className="space-y-6 text-white dark:text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full border-2 border-orange-500 flex items-center justify-center">
                <span className="text-orange-500 font-bold text-xl">O</span>
              </div>
              <h1 className="text-3xl font-bold text-white">Innovation</h1>
            </div>
            <h2 className="text-5xl font-bold text-red-500 transform -rotate-2" style={{ fontFamily: 'cursive' }}>
              SAX!
            </h2>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <img 
              src="/sax.png" 
              alt="Sax" 
              className="w-16 h-16 object-contain"
            />
            <p className="text-gray-300 text-lg leading-relaxed">
              La musica è cambiata, vieni ad ascoltarla
            </p>
          </div>
        </div>

        {/* Sezione destra - Pulsante di login */}
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="bg-gray-800/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-12 shadow-2xl border border-gray-700 dark:border-gray-700 transform rotate-1 hover:rotate-0 transition-transform duration-300">
            <button
              onClick={() => loginWithRedirect()}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-lg"
            >
              Accedi con Auth0
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

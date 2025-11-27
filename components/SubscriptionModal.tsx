
import React from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { CloseIcon, CrownIcon } from './Icons';

const SubscriptionModal: React.FC = () => {
  const { showModal, setShowModal, startTrial, subscribe } = useSubscription();

  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast p-4">
      <div className="bg-gradient-to-b from-neutral-900 to-black rounded-2xl shadow-2xl shadow-amber-900/20 p-1 max-w-md w-full relative border border-amber-500/30">
        <div className="bg-black rounded-xl p-8 text-center relative overflow-hidden">
            
            {/* Background decoration */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>

            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-amber-400 transition-colors z-10">
            <CloseIcon className="w-6 h-6" />
            </button>

            <div className="flex justify-center mb-6 relative">
                <div className="relative">
                    <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20"></div>
                    <div className="p-4 bg-gradient-to-br from-amber-900/40 to-black border border-amber-500/50 rounded-full relative z-10">
                        <CrownIcon className="w-10 h-10 text-amber-400" />
                    </div>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 mb-3">Premium Access</h2>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            Unlock the full potential of News Pulse AI. Get unlimited translations, exclusive regional news, and advanced audio features.
            </p>

            <div className="bg-neutral-900/80 border border-neutral-800 p-6 rounded-xl mb-8 relative group hover:border-amber-900/50 transition-colors">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-600 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">Best Value</div>
                <p className="text-5xl font-serif text-amber-400 font-medium">₹799 <span className="text-sm font-sans text-gray-500 font-normal">/ month</span></p>
                <p className="text-gray-600 text-xs mt-2">Cancel anytime. No hidden fees.</p>
            </div>

            <div className="space-y-4">
            <button
                onClick={subscribe}
                className="w-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black font-bold py-3.5 rounded-lg hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 transition-all transform hover:scale-[1.02] shadow-lg shadow-amber-900/30"
            >
                Subscribe Now
            </button>
            <button
                onClick={startTrial}
                className="w-full bg-transparent border border-neutral-700 text-gray-300 font-semibold py-3.5 rounded-lg hover:border-amber-500/50 hover:text-amber-400 transition-all"
            >
                Start 3-Day Free Trial
            </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-6">
            Subscriptions are handled by Adapty. By subscribing, you agree to our Terms of Service.
            </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;

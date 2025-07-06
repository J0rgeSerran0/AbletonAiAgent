import { motion, AnimatePresence } from "motion/react";
import { FaTimes, FaCoffee, FaInfoCircle } from "react-icons/fa";
import Image from 'next/image';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AboutModal = ({ isOpen, onClose }: AboutModalProps) => {
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop/Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 z-[60]"
                        onClick={handleOverlayClick}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 200
                        }}
                        className="fixed inset-0 flex items-center justify-center p-4 z-[70]"
                    >
                        <div className="w-full max-w-md bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <div className="flex items-center">
                                    <FaInfoCircle className="text-blue-500 mr-3" />
                                    <h2 className="text-xl font-semibold text-gray-800">About</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <FaTimes className="text-gray-600" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {/* App Logo and Title */}
                                <div className="flex items-center justify-center mb-6">
                                    <div className="flex items-center">
                                        <Image src='/robot.png' alt='logo' width={60} height={60} />
                                        <div className="ml-4">
                                            <h3 className="text-2xl font-bold text-gray-800 font-gabarito">
                                                Ableton Live 12 AI Assistant
                                            </h3>
                                            <p className="text-sm text-gray-600 font-afacad">
                                                Version 1.0.0
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mb-6">
                                    <p className="text-gray-700 leading-relaxed font-afacad">
                                        Get expert answers to Ableton Live 12 questions and learn with AI-powered assistance
                                        tailored to your skill level. Whether you&apos;re a beginner or an advanced user,
                                        this assistant helps you master Ableton Live 12&apos;s features and workflows.
                                    </p>
                                </div>

                                {/* Features */}
                                <div className="mb-6">
                                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Features</h4>
                                    <ul className="space-y-2 text-gray-700 font-afacad">
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2">•</span>
                                            AI-powered responses based on Ableton Live 12 documentation
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2">•</span>
                                            Skill-level adaptive learning
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2">•</span>
                                            Share conversations with others
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2">•</span>
                                            Image analysis and support
                                        </li>
                                    </ul>
                                </div>

                                                            {/* Support */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => window.open('https://coff.ee/rafasaraceni', '_blank', 'noopener,noreferrer')}
                                    className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center font-medium"
                                >
                                    <FaCoffee className="mr-2" />
                                    Buy me a coffee ☕
                                </button>
                            </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-200">
                                <div className="text-xs text-gray-500 text-center font-afacad">
                                    Made with ❤️ for the Ableton Live community
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}; 
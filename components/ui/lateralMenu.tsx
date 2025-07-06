import { useState } from "react";
import { toast } from "sonner";
import { saEvent } from '@/app/analytics';
import { FaShareAlt, FaTimes, FaHistory, FaCog, FaQuestionCircle, FaGithub, FaCoffee, FaInfoCircle, FaGlobe, FaInstagram } from "react-icons/fa";
import { FaBluesky } from "react-icons/fa6";
import { motion, AnimatePresence } from "motion/react";
import { AboutModal } from './aboutModal';

interface LateralMenuProps {
    sessionId: string;
    isShareEnabled: boolean;
    isOpen: boolean;
    onClose: () => void;
}

export const LateralMenu = ({
    sessionId,
    isShareEnabled,
    isOpen,
    onClose,
}: LateralMenuProps) => {
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

    const handleShare = () => {
        saEvent('share_link_button_clicked');
        const shareUrl = `${window.location.origin}?sessionId=${sessionId}`;
        navigator.clipboard.writeText(shareUrl);
        toast("Share link copied to clipboard!");
        onClose();
    };

    const handleAboutClick = () => {
        setIsAboutModalOpen(true);
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop/Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/50 z-40 md:bg-black/30"
                            onClick={handleOverlayClick}
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 200
                            }}
                            className="fixed top-0 left-0 h-full w-80 md:w-96 bg-white shadow-2xl z-50 flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <FaTimes className="text-gray-600" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {/* Share Section */}
                                {isShareEnabled && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                            Share this chat
                                        </h3>
                                        <button
                                            onClick={handleShare}
                                            className="w-full text-left p-2 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-600 flex items-center"
                                        >
                                            <FaShareAlt className="mr-2" />
                                            Get chat link
                                        </button>
                                    </div>
                                )}

                                {/* Help Section */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                        Help
                                    </h3>
                                    <div className="space-y-2">
                                        <button
                                            onClick={handleAboutClick}
                                            className="w-full text-left p-2 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-600 flex items-center"
                                        >
                                            <FaInfoCircle className="mr-2" />
                                            About
                                        </button>
                                        <button className="w-full text-left p-2 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-600">
                                            <a className="flex items-center" href="https://github.com/saraceni/" target="_blank" rel="noopener noreferrer">
                                                <FaGithub className="mr-2" />
                                                GitHub
                                            </a>
                                        </button>
                                    </div>
                                </div>

                                {/* Author Section */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                        Author
                                    </h3>
                                    <div className="space-y-2">
                                        <button 
                                            onClick={() => window.open('https://saraceni.me', '_blank', 'noopener,noreferrer')}
                                            className="w-full text-left p-2 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-600 flex items-center"
                                        >
                                            <FaGlobe className="mr-2" />
                                            Website
                                        </button>
                                        <button 
                                            onClick={() => window.open('https://bsky.app/profile/saraceni-br.bsky.social', '_blank', 'noopener,noreferrer')}
                                            className="w-full text-left p-2 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-600 flex items-center"
                                        >
                                            <FaBluesky className="mr-2" />
                                            Bluesky
                                        </button>
                                        <button 
                                            onClick={() => window.open('https://www.instagram.com/klaus.guitar.sessions/', '_blank', 'noopener,noreferrer')}
                                            className="w-full text-left p-2 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-600 flex items-center"
                                        >
                                            <FaInstagram className="mr-2" />
                                            Instagram
                                        </button>
                                    </div>
                                </div>

                                {/* Buy Me a Coffee Section */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                        Support the project
                                    </h3>
                                    <button
                                        onClick={() => window.open('https://coff.ee/rafasaraceni', '_blank', 'noopener,noreferrer')}
                                        className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center font-medium"
                                    >
                                        <FaCoffee className="mr-2" />
                                        Buy me a coffee ☕
                                    </button>
                                </div>

                                {/* Made with Love Section */}
                                <div className="mb-6">
                                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                                        <div className="text-sm text-gray-600 font-afacad mb-2">
                                            Made with ❤️ for the
                                        </div>
                                        <div className="text-lg font-bold text-gray-800 font-gabarito">
                                            Ableton Live Community
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-gray-200">
                                <div className="text-xs text-gray-500 text-center">
                                    Version: 1.0.0
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* About Modal */}
            <AboutModal
                isOpen={isAboutModalOpen}
                onClose={() => setIsAboutModalOpen(false)}
            />
        </>
    );
};
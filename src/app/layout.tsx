import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MongoDB Replica Set DR Simulator',
  description: 'Interactive educational tool for learning MongoDB disaster recovery scenarios',
  keywords: 'MongoDB, replica set, disaster recovery, simulation, education',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        {children}
      </body>
    </html>
  );
}

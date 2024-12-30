import { FC } from 'react';
import Link from 'next/link';
import { SyringeIcon, TwitterIcon } from 'lucide-react';
export const Footer: FC = () => {
    return (
        <div className="flex">
            <footer className="border-t-2 border-[#ffffff] bg-[#D98F72] w-screen" >
                <div className="py-4 flex justify-center">
                    <div className="grid grid-cols-2">
                        <Link href={"https://pump.fun/coin/"} target='_blank' className='flex mx-4'>
                            <SyringeIcon />
                            <div className='ml-2'>PUMP.FUN</div>
                        </Link>
                        <Link href={"https://x.com/tbits_io"} target='_blank' className='flex mx-4'>
                            <TwitterIcon />
                            <div className='ml-2'>$TBITS</div>
                        </Link>

                    </div>
                </div>
            </footer>
        </div>
    );
};

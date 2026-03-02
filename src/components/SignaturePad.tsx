'use client';

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './ui/Button';

export interface SignaturePadRef {
    getSignature: () => string | null;
    clear: () => void;
    isEmpty: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadRef>((_, ref) => {
    const padRef = useRef<SignatureCanvas | null>(null);

    useImperativeHandle(ref, () => ({
        getSignature: () => {
            if (padRef.current && !padRef.current.isEmpty()) {
                return padRef.current.getTrimmedCanvas().toDataURL('image/png');
            }
            return null;
        },
        clear: () => {
            padRef.current?.clear();
        },
        isEmpty: () => {
            return padRef.current?.isEmpty() ?? true;
        }
    }));

    return (
        <div className="flex flex-col gap-2">
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-inner">
                <SignatureCanvas
                    ref={(ref) => { padRef.current = ref; }}
                    canvasProps={{
                        className: 'signature-canvas w-full h-40 touch-none',
                    }}
                    backgroundColor="rgba(255,255,255,1)"
                />
            </div>
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => padRef.current?.clear()}>
                    Effacer
                </Button>
            </div>
        </div>
    );
});

SignaturePad.displayName = 'SignaturePad';
export default SignaturePad;

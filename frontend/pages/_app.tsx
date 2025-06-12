import React from 'react';
import { connect } from '@stacks/connect';
import { STACKS_TESTNET } from '@stacks/network';
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';

const appDetails = {
    name: 'Simple Donation Tracker',
    icon: 'https://example.com/icon.png',
};

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <>
            <Component {...pageProps} />
            <Toaster position="top-right" />
        </>
    );
}

export default MyApp;

import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const { name, email, message } = await request.json();

        // Send the email
        const { data, error } = await resend.emails.send({
            from: 'Contact Form <noreply@contact.elevv.net>', // Must be from your verified domain
            to: ['contactelevv@gmail.com'], // The email where you want to receive messages
            subject: `New Feedback from ${name} via elevv.net`,
            replyTo: email,
            html: `<p>You have a new message from:</p>
             <p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <hr>
             <p><strong>Message:</strong></p>
             <p>${message}</p>`,
        });

        if (error) {
            // Also log the specific error from the Resend response
            console.error("Resend API Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }


        return NextResponse.json({ message: 'Email sent successfully!', data });

    } catch (error) {
        // --- THIS IS THE CRUCIAL CHANGE ---
        // Log the entire error object to see the full details
        console.error("Caught an exception:", JSON.stringify(error, null, 2));

        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
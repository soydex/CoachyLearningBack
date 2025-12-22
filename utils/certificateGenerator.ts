import PDFDocument from 'pdfkit';
import { Response } from 'express';

interface CertificateData {
    studentName: string;
    courseTitle: string;
    completionDate: Date;
    organization: string;
    id: string;
}

export const generateCertificate = (data: CertificateData, res: Response): void => {
    const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 50
    });

    // Pipe the PDF into the response
    doc.pipe(res);

    // Background (Optional: simpler without image assets for now, just border)
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .stroke('#1e3a8a'); // Dark blue border

    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .stroke('#e2e8f0'); // Inner Light border

    // Header
    doc.moveDown(4);
    doc.font('Helvetica-Bold')
        .fontSize(40)
        .fillColor('#1e3a8a')
        .text('CERTIFICAT DE RÉUSSITE', { align: 'center' });

    doc.moveDown(1);

    // Body
    doc.font('Helvetica')
        .fontSize(20)
        .fillColor('#475569')
        .text('Ce certificat est fièrement décerné à', { align: 'center' });

    doc.moveDown(1);

    doc.font('Helvetica-Bold')
        .fontSize(35)
        .fillColor('#0f172a')
        .text(data.studentName, { align: 'center' });

    doc.moveDown(1);

    doc.font('Helvetica')
        .fontSize(20)
        .fillColor('#475569')
        .text('Pour avoir complété avec succès le cours', { align: 'center' });

    doc.moveDown(1);

    doc.font('Helvetica-Bold')
        .fontSize(30)
        .fillColor('#0f172a')
        .text(data.courseTitle, { align: 'center' });

    doc.moveDown(2);

    // Footer / Details
    doc.fontSize(15)
        .fillColor('#64748b')
        .text(`Délivré le : ${data.completionDate.toLocaleDateString('fr-FR')}`, { align: 'center' });

    doc.text(`ID Certificat : ${data.id}`, { align: 'center' });

    doc.moveDown(2);

    // Signature Area
    doc.fontSize(18)
        .fillColor('#1e3a8a')
        .text(data.organization, { align: 'center' });

    // Finalize the PDF and end the stream
    doc.end();
};

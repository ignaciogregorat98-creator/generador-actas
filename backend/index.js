const express = require('express');
const cors = require('cors');
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');

const app = express();
app.use(cors());
app.use(express.json());

const MODELOS = {
  firma: (n) => `Acto seguido, se pone a consideración el ${n}° punto del orden del día: Designación de dos socios para firmar el Acta de Reunión. Puesto a consideración el punto, por unanimidad se resuelve que el Acta será suscripta por ..., D.N.I. ... y ..., D.N.I. ...`,
  reforma: (n) => `Acto seguido se pone a consideración el ${n}° punto del orden del día: Reforma del Contrato Social. Toma la palabra el Gerente y manifiesta la conveniencia de proceder a la modificación del Contrato Social en los siguientes términos: ... Sometido el punto a votación, por unanimidad de los socios presentes se resuelve modificar el Contrato Social, cuyo texto queda redactado de la siguiente manera: ... Se instruyó al Gerente para que proceda a realizar las gestiones registrales pertinentes ante el organismo de contralor correspondiente.`,
  autoridades: (n) => `Acto seguido se pone a consideración el ${n}° punto del orden del día: Designación de Gerente. Por unanimidad se resuelve designar como Gerente de la sociedad, por el término de ..., al/a la señor/a ..., D.N.I. N° ..., con domicilio en ..., quien acepta el cargo y constituye domicilio especial en la sede social.`,
  ratificacion: (n) => `Acto seguido se pone a consideración el ${n}° punto del orden del día: Ratificación y rectificación del Acta N° ... de fecha ... Toma la palabra el Gerente e informa que en el Acta N° ... de fecha ... se consignó erróneamente ..., debiendo decir correctamente: ... Sometido el punto a votación, por unanimidad de los socios presentes se resuelve ratificar en todos sus términos el Acta N° ..., con la rectificación precedentemente indicada.`,
  balance: (n) => `Acto seguido se pone a consideración el ${n}° punto del orden del día: Consideración y aprobación de los Estados Contables correspondientes al Ejercicio N° ... cerrado el ... El Gerente somete a consideración de los socios los Estados Contables del Ejercicio N° ..., compuestos por Estado de Situación Patrimonial, Estado de Resultados, Estado de Evolución del Patrimonio Neto, Notas y Anexos, auditados por el/la Contador/a ..., matrícula N° ... Sometidos a votación, por unanimidad se resuelve aprobarlos en todos sus términos, arrojando el ejercicio un resultado de ... por la suma de $ ...`
};

const LABELS = {
  firma: 'Designación de dos socios para firmar el Acta de Reunión.',
  reforma: 'Reforma del Contrato Social.',
  autoridades: 'Designación de Gerente.',
  ratificacion: 'Ratificación y rectificación de Acta anterior.',
  balance: 'Consideración y aprobación de Estados Contables.'
};

function formatFecha(str) {
  if (!str) return '...';
  const [y, m, d] = str.split('-');
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${parseInt(d)} de ${meses[parseInt(m)-1]} de ${y}`;
}

function buildParrafo(linea, esTitulo, esSubtitulo) {
  const partes = linea.split(/(\.\.\.)/g);
  const runs = partes.map(p => {
    if (p === '...') {
      return new TextRun({ text: '          ', highlight: 'yellow', font: 'Arial', size: 24 });
    } else if (p) {
      return new TextRun({ text: p, bold: esTitulo || esSubtitulo, font: 'Arial', size: esTitulo ? 28 : 24 });
    }
    return null;
  }).filter(Boolean);
  if (runs.length === 0) runs.push(new TextRun({ text: '', font: 'Arial', size: 24 }));
  return new Paragraph({
    children: runs,
    alignment: esTitulo ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { before: esTitulo ? 0 : 160, after: 160, line: 380 }
  });
}

app.post('/generar', async (req, res) => {
  try {
    const { nombre, lugar, fecha, hora, tipoReunion, participantes, autoridad, puntos, textosEditados } = req.body;
    const tipoR = tipoReunion === 'ord' ? 'Ordinaria' : 'Extraordinaria';
    const fechaFormateada = formatFecha(fecha);
    const odTexto = puntos.map((id, i) => `${i+1}.      ${LABELS[id]}`).join('\n');

    const lineas = [
      nombre.toUpperCase(),
      `Reunión de Socios ${tipoR} — Acta N° ...`,
      '',
      `En la ciudad de ${lugar}, a los ${fechaFormateada}, siendo las ${hora} horas, se reúnen en la sede social los socios de ${nombre}: ${participantes}, quienes representan el ...% del capital social.`,
      '',
      `Encontrándose presente el Gerente señor/a ${autoridad}, quien preside el acto, y habiéndose verificado el quórum necesario para sesionar, no habiendo objeciones en cuanto a la constitución del acto, se declara válidamente abierta la Reunión de Socios, procediéndose a considerar el siguiente Orden del Día:`,
      '',
      ...odTexto.split('\n'),
      '',
      ...puntos.map((id, i) => {
        const texto = (textosEditados && textosEditados[id]) ? textosEditados[id] : MODELOS[id](i+1);
        return texto;
      }),
      '',
      'No habiendo más asuntos que tratar, siendo las ... horas, se da por finalizada la Reunión de Socios, labrándose la presente Acta que, leída y hallada conforme, es firmada por los presentes.',
      '',
      '...',
      '...'
    ];

    const parrafos = lineas.map((linea, idx) => buildParrafo(linea, idx === 0, idx === 1));

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1701 }
          }
        },
        children: parrafos
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Acta_${nombre.replace(/\s+/g,'_')}.docx"`);
    res.send(buffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('Backend generador de actas OK'));

app.listen(3001, () => console.log('Backend corriendo en http://localhost:3001'));